# backend/models/job.py
"""Job model for tracking configuration job submissions to C4H service."""

from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Status of a job."""
    CREATED = "created"
    SUBMITTED = "submitted"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobResult(BaseModel):
    """Result of a job execution."""
    output: Optional[str] = Field(None, description="Output text or content")
    artifacts: List[Dict[str, Any]] = Field(default_factory=list, description="Artifacts produced")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Execution metrics")
    error: Optional[str] = Field(None, description="Error message if job failed")


class ConfigReference(BaseModel):
    """Reference to a specific configuration."""
    id: str = Field(..., description="Identifier of the configuration")
    version: str = Field(..., description="Version of the configuration")


class Job(BaseModel):
    """Job represents a configuration tuple submission to the C4H service."""
    id: str = Field(..., description="Unique identifier for the job")
    configurations: Dict[str, ConfigReference] = Field(
        ..., description="Map of configuration types to references"
    )
    status: JobStatus = Field(JobStatus.CREATED, description="Current status of the job")
    service_job_id: Optional[str] = Field(None, description="Job ID in the C4H service")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = Field(None)
    completed_at: Optional[datetime] = Field(None)
    user_id: Optional[str] = Field(None, description="User who submitted the job")
    configuration: Dict[str, Any] = Field(default_factory=dict, description="Job configuration")
    result: Optional[JobResult] = Field(None, description="Job execution result")
    
    def update_status(self, status: JobStatus, result: Optional[Dict[str, Any]] = None):
        """Update the status of the job."""
        self.status = status
        self.updated_at = datetime.utcnow()
        
        if status == JobStatus.SUBMITTED and not self.submitted_at:
            self.submitted_at = datetime.utcnow()
            
        if status in (JobStatus.COMPLETED, JobStatus.FAILED) and not self.completed_at:
            self.completed_at = datetime.utcnow()
            
        if result and (status == JobStatus.COMPLETED or status == JobStatus.FAILED):
            self.result = JobResult(**result)

    def get_configuration_ids(self) -> Dict[str, str]:
        """Get a map of configuration types to IDs."""
        return {config_type: config_ref.id for config_type, config_ref in self.configurations.items()}
