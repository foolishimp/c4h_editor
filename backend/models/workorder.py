# File: backend/models/workorder.py
"""
WorkOrder model for defining refactoring tasks.
Contains only the content models necessary for generic Configuration support.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator
from enum import Enum

class ParameterType(str, Enum):
    """Types of parameters that can be used in a workorder template."""
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"

class WorkOrderParameter(BaseModel):
    """Definition of a parameter that can be used in a workorder template."""
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

class WorkOrderConfig(BaseModel):
    """Configuration options for the workorder."""
    temperature: float = Field(0.7, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(None, gt=0)
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    frequency_penalty: Optional[float] = Field(None, ge=0.0, le=2.0)
    presence_penalty: Optional[float] = Field(None, ge=0.0, le=2.0)
    stop_sequences: List[str] = Field(default_factory=list)
    service_id: Optional[str] = Field(None, description="Target C4H service ID")
    workflow_id: Optional[str] = Field(None, description="Workflow ID for processing")
    max_runtime: Optional[int] = Field(None, description="Maximum runtime in seconds")
    notify_on_completion: bool = Field(False, description="Whether to notify on completion")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Service-specific parameters")

class WorkOrderTemplate(BaseModel):
    """The core workorder template with text and configuration."""
    text: str = Field(..., description="The workorder template text")
    parameters: List[WorkOrderParameter] = Field(default_factory=list)
    config: WorkOrderConfig = Field(default_factory=WorkOrderConfig)
    
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

class WorkOrderContent(BaseModel):
    """Content of a work order for compatibility with Configuration model."""
    template: WorkOrderTemplate = Field(..., description="The template definition")
    
    def render(self, parameters: Dict[str, Any]) -> str:
        """Renders the workorder template with the provided parameters."""
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

class WorkOrderTestCase(BaseModel):
    """Test case for a workorder with inputs and expected outputs."""
    name: str
    parameters: Dict[str, Any]
    expected_output: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)