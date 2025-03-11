# File: backend/models/workorder.py
"""WorkOrder model extending the Prompt model with additional fields."""

from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator

from backend.models.prompt import Prompt, PromptMetadata


class WorkOrderMetadata(PromptMetadata):
    """Extended metadata for work orders."""
    asset: Optional[str] = Field(None, description="Asset being worked on")
    intent: Optional[str] = Field(None, description="User's intent for the work")
    goal: Optional[str] = Field(None, description="Goal of the work order")
    priority: Optional[str] = Field(None, description="Priority of the work order")
    due_date: Optional[datetime] = Field(None, description="Due date for the work order")
    assignee: Optional[str] = Field(None, description="Person assigned to the work order")


class WorkOrderConfig(BaseModel):
    """Configuration for work order processing."""
    service_id: Optional[str] = Field(None, description="Target C4H service ID")
    workflow_id: Optional[str] = Field(None, description="Workflow ID for processing")
    max_runtime: Optional[int] = Field(None, description="Maximum runtime in seconds")
    notify_on_completion: bool = Field(False, description="Whether to notify on completion")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Service-specific parameters")


class WorkOrder(Prompt):
    """Work order extends the Prompt model with additional metadata and configuration."""
    metadata: WorkOrderMetadata = Field(..., description="Work order metadata")
    config: Optional[WorkOrderConfig] = Field(None, description="Work order configuration")
    
    def to_submission_payload(self) -> Dict[str, Any]:
        """Convert the work order to a submission payload for the C4H service."""
        # Render the prompt with any default parameters
        rendered_prompt = self.render({})
        
        # Build the submission payload
        payload = {
            "id": self.id,
            "prompt": rendered_prompt,
            "metadata": self.metadata.dict(),
            "config": self.config.dict() if self.config else {}
        }
        
        return payload
    
    @classmethod
    def from_prompt(cls, prompt: Prompt) -> "WorkOrder":
        """Create a work order from an existing prompt."""
        # Create work order metadata from prompt metadata
        wo_metadata = WorkOrderMetadata(**prompt.metadata.dict())
        
        # Create work order
        return cls(
            id=prompt.id,
            template=prompt.template,
            metadata=wo_metadata,
            parent_id=prompt.parent_id,
            lineage=prompt.lineage,
            config=WorkOrderConfig()  # Default empty config
        )