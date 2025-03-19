#!/usr/bin/env python
# Script to update WorkOrder model for compatibility with new architecture

import os
import sys
from pathlib import Path

# Ensure backend directory exists
backend_dir = Path("backend")
if not backend_dir.exists():
    print("Error: backend directory not found")
    sys.exit(1)

# Ensure models directory exists
models_dir = backend_dir / "models"
if not models_dir.exists():
    print("Error: models directory not found")
    sys.exit(1)

# Update workorder.py to be compatible with Configuration base model
workorder_model_path = models_dir / "workorder.py"
if workorder_model_path.exists():
    # Create updated workorder.py with compatibility with base Configuration model
    with open(workorder_model_path, "w") as f:
        f.write("""# backend/models/workorder.py
\"\"\"
WorkOrder model for defining refactoring tasks.
Updated to be compatible with the base Configuration model.
\"\"\"

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

from backend.models.configuration import Configuration, ConfigurationMetadata, ConfigurationVersion

class ParameterType(str, Enum):
    \"\"\"Types of parameters that can be used in a workorder template.\"\"\"
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"

class WorkOrderParameter(BaseModel):
    \"\"\"Definition of a parameter that can be used in a workorder template.\"\"\"
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
    \"\"\"Configuration options for the workorder.\"\"\"
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
    \"\"\"The core workorder template with text and configuration.\"\"\"
    text: str = Field(..., description="The workorder template text")
    parameters: List[WorkOrderParameter] = Field(default_factory=list)
    config: WorkOrderConfig = Field(default_factory=WorkOrderConfig)
    
    def validate_template(self) -> bool:
        \"\"\"Validates that all parameters in the template are defined.\"\"\"
        import re
        # Find all parameters in the template using a regex pattern like {parameter_name}
        pattern = r'\\{([a-zA-Z_][a-zA-Z0-9_]*)\\}'
        referenced_params = set(re.findall(pattern, self.text))
        defined_params = {param.name for param in self.parameters}
        
        # Check if all referenced parameters are defined
        missing_params = referenced_params - defined_params
        if missing_params:
            raise ValueError(f"Template references undefined parameters: {missing_params}")
        
        return True

class WorkOrderContent(BaseModel):
    \"\"\"Content of a work order for compatibility with Configuration model.\"\"\"
    template: WorkOrderTemplate = Field(..., description="The template definition")
    
    def render(self, parameters: Dict[str, Any]) -> str:
        \"\"\"Renders the workorder template with the provided parameters.\"\"\"
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

# Legacy model for backward compatibility
class WorkOrderMetadata(ConfigurationMetadata):
    \"\"\"Metadata associated with a workorder.\"\"\"
    # Extended metadata for work orders
    asset: Optional[str] = Field(None, description="Asset being worked on")
    intent: Optional[str] = Field(None, description="User's intent for the work")
    goal: Optional[str] = Field(None, description="Goal of the work order")
    priority: Optional[str] = Field(None, description="Priority of the work order")
    due_date: Optional[datetime] = Field(None, description="Due date for the work order")
    assignee: Optional[str] = Field(None, description="Person assigned to the work order")

# Legacy model for backward compatibility
class WorkOrder(Configuration):
    \"\"\"
    Complete workorder definition.
    This class provides compatibility between the legacy WorkOrder model
    and the new Configuration-based architecture.
    \"\"\"
    config_type: str = "workorder"
    content: WorkOrderContent
    metadata: WorkOrderMetadata
    
    def render(self, parameters: Dict[str, Any]) -> str:
        \"\"\"Renders the workorder template with the provided parameters.\"\"\"
        return self.content.render(parameters)

    def to_submission_payload(self) -> Dict[str, Any]:
        \"\"\"Convert the work order to a submission payload for the C4H service.\"\"\"
        # Render the workorder with any default parameters
        try:
            rendered_prompt = self.render({})
        except ValueError:
            # If required params are missing, just use the template text
            rendered_prompt = self.content.template.text
        
        # Build the submission payload
        payload = {
            "id": self.id,
            "prompt": rendered_prompt,
            "metadata": self.metadata.dict(),
            "config": self.content.template.config.dict() if self.content.template.config else {}
        }
        
        return payload
    
    @classmethod
    def from_legacy(cls, legacy_workorder):
        \"\"\"Create a new WorkOrder from a legacy WorkOrder model.\"\"\"
        # Convert legacy template to new content format
        content = WorkOrderContent(
            template=legacy_workorder.template
        )
        
        return cls(
            id=legacy_workorder.id,
            config_type="workorder",
            content=content,
            metadata=legacy_workorder.metadata,
            parent_id=legacy_workorder.parent_id,
            lineage=legacy_workorder.lineage
        )
    
    @classmethod
    def create(cls, id: str, template: WorkOrderTemplate, metadata: Optional[WorkOrderMetadata] = None):
        \"\"\"Create a new WorkOrder.\"\"\"
        if metadata is None:
            metadata = WorkOrderMetadata(author="system")
            
        content = WorkOrderContent(template=template)
        
        return cls(
            id=id,
            config_type="workorder",
            content=content,
            metadata=metadata
        )

class WorkOrderVersion(ConfigurationVersion):
    \"\"\"Information about a specific version of a workorder.\"\"\"
    configuration: WorkOrder

class WorkOrderTestCase(BaseModel):
    \"\"\"Test case for a workorder with inputs and expected outputs.\"\"\"
    name: str
    parameters: Dict[str, Any]
    expected_output: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
""")

    print(f"Updated {workorder_model_path}")
else:
    print(f"Warning: {workorder_model_path} does not exist.")

print("WorkOrder Model updated successfully.")