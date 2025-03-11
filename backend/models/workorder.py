# File: backend/models/workorder.py
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

class WorkOrderMetadata(BaseModel):
    """Metadata associated with a workorder."""
    author: str = Field(..., description="Author of the workorder")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = Field(None, description="Description of the workorder")
    tags: List[str] = Field(default_factory=list, description="Tags for categorizing workorders")
    target_model: Optional[str] = Field(None, description="Target model for the workorder")
    version: str = Field("1.0.0", description="Semantic version of the workorder")
    # Extended metadata for work orders
    asset: Optional[str] = Field(None, description="Asset being worked on")
    intent: Optional[str] = Field(None, description="User's intent for the work")
    goal: Optional[str] = Field(None, description="Goal of the work order")
    priority: Optional[str] = Field(None, description="Priority of the work order")
    due_date: Optional[datetime] = Field(None, description="Due date for the work order")
    assignee: Optional[str] = Field(None, description="Person assigned to the work order")

class WorkOrderConfig(BaseModel):
    """Configuration options for the workorder."""
    temperature: float = Field(0.7, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(None, gt=0)
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    frequency_penalty: Optional[float] = Field(None, ge=0.0, le=2.0)
    presence_penalty: Optional[float] = Field(None, ge=0.0, le=2.0)
    stop_sequences: List[str] = Field(default_factory=list)
    # Additional configuration for work order processing
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

from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator

from backend.models.prompt import Prompt, PromptMetadata

class WorkOrder(BaseModel):
    """Complete workorder definition including template, metadata, and configuration."""
    id: str = Field(..., description="Unique identifier for the workorder")
    template: WorkOrderTemplate
    metadata: WorkOrderMetadata
    parent_id: Optional[str] = Field(None, description="ID of the parent workorder if this is derived")
    lineage: List[str] = Field(default_factory=list, description="Lineage chain of workorder IDs")
    
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

    def to_submission_payload(self) -> Dict[str, Any]:
        """Convert the work order to a submission payload for the C4H service."""
        # Render the workorder with any default parameters
        rendered_prompt = self.render({})
        
        # Build the submission payload
        payload = {
            "id": self.id,
            "prompt": rendered_prompt,
            "metadata": self.metadata.dict(),
            "config": self.template.config.dict() if self.template.config else {}
        }
        
        return payload

class WorkOrderVersion(BaseModel):
    """Information about a specific version of a workorder."""
    workorder_id: str
    version: str
    commit_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    author: str
    message: str
    workorder: WorkOrder