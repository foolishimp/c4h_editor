# File: backend/models/prompt.py

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum


class ParameterType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"


class PromptParameter(BaseModel):
    """Definition of a parameter that can be used in a prompt template."""
    name: str = Field(..., description="Name of the parameter")
    type: ParameterType = Field(..., description="Data type of the parameter")
    description: Optional[str] = Field(None, description="Description of the parameter")
    default: Optional[Any] = Field(None, description="Default value for the parameter")
    required: bool = Field(True, description="Whether the parameter is required")
    
    @validator('name')
    def validate_name(cls, v):
        if not v.isidentifier():
            raise ValueError(f"Parameter name '{v}' must be a valid identifier")
        return v


class PromptMetadata(BaseModel):
    """Metadata associated with a prompt."""
    author: str = Field(..., description="Author of the prompt")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = Field(None, description="Description of the prompt")
    tags: List[str] = Field(default_factory=list, description="Tags for categorizing prompts")
    target_model: Optional[str] = Field(None, description="Target model for the prompt")
    version: str = Field("1.0.0", description="Semantic version of the prompt")


class PromptConfig(BaseModel):
    """Configuration options for the prompt."""
    temperature: float = Field(0.7, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(None, gt=0)
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    frequency_penalty: Optional[float] = Field(None, ge=0.0, le=2.0)
    presence_penalty: Optional[float] = Field(None, ge=0.0, le=2.0)
    stop_sequences: List[str] = Field(default_factory=list)


class PromptTemplate(BaseModel):
    """The core prompt template with text and configuration."""
    text: str = Field(..., description="The prompt template text")
    parameters: List[PromptParameter] = Field(default_factory=list)
    config: PromptConfig = Field(default_factory=PromptConfig)
    
    def validate_template(self) -> bool:
        """Validates that all parameters in the template are defined."""
        import re
        # Find all parameters in the template using a regex pattern like {parameter_name}
        pattern = r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}'
        referenced_params = set(re.findall(pattern, self.text))
        defined_params = {param.name for param in self.parameters}
        
        # Check if all referenced parameters are defined
        missing_params = referenced_params - defined_params
        if missing_params:
            raise ValueError(f"Template references undefined parameters: {missing_params}")
        
        return True


class Prompt(BaseModel):
    """Complete prompt definition including template, metadata, and configuration."""
    id: str = Field(..., description="Unique identifier for the prompt")
    template: PromptTemplate
    metadata: PromptMetadata
    parent_id: Optional[str] = Field(None, description="ID of the parent prompt if this is derived")
    lineage: List[str] = Field(default_factory=list, description="Lineage chain of prompt IDs")
    
    def render(self, parameters: Dict[str, Any]) -> str:
        """Renders the prompt template with the provided parameters."""
        # Validate parameters against the template
        self.template.validate_template()
        
        # Check for missing required parameters
        required_params = {p.name for p in self.template.parameters if p.required}
        provided_params = set(parameters.keys())
        missing_params = required_params - provided_params
        
        if missing_params:
            raise ValueError(f"Missing required parameters: {missing_params}")
        
        # Apply default values for missing optional parameters
        for param in self.template.parameters:
            if param.name not in parameters and param.default is not None:
                parameters[param.name] = param.default
        
        # Render the template by replacing parameters
        rendered = self.template.text
        for name, value in parameters.items():
            rendered = rendered.replace(f"{{{name}}}", str(value))
            
        return rendered


class PromptVersion(BaseModel):
    """Information about a specific version of a prompt."""
    prompt_id: str
    version: str
    commit_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    author: str
    message: str
    prompt: Prompt


class PromptTestCase(BaseModel):
    """Test case for a prompt with inputs and expected outputs."""
    name: str
    parameters: Dict[str, Any]
    expected_output: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)