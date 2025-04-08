# backend/models/job.py
"""Job model for tracking configuration job submissions to C4H service."""

from datetime import datetime, UTC
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
    artifacts: List[Dict[str, Any]] = Field(default_factory=list, 
                                            description="Artifacts produced")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Execution metrics")
    error: Optional[str] = Field(None, description="Error message if job failed")


class StatusChangeEvent(BaseModel):
    """Record of a job status change event."""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    old_status: Optional[JobStatus] = Field(None, description="Previous status")
    new_status: JobStatus = Field(..., description="New status")
    reason: Optional[str] = Field(None, description="Reason for status change")
    actor: Optional[str] = Field(None, description="User or system that changed status")


class JobHistoryEntry(BaseModel):
    """Entry in the job history log."""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    event_type: str = Field(..., description="Type of event (status_change, result_update, etc.)")
    user_id: Optional[str] = Field(None, description="User who triggered the event")
    details: Dict[str, Any] = Field(default_factory=dict, 
                                   description="Event-specific details")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class ConfigReference(BaseModel, frozen=True):
    """Reference to a specific configuration."""
    id: str = Field(..., description="Identifier of the configuration")
    version: str = Field(..., description="Version of the configuration")


class Job(BaseModel):
    """Job represents a configuration tuple submission to the C4H service."""
    id: str = Field(..., description="Unique identifier for the job")
    
    # Immutable job definition
    configurations: Dict[str, ConfigReference] = Field(
        ..., description="Map of configuration types to references"
    )
    user_id: Optional[str] = Field(None, description="User who submitted the job")
    configuration: Dict[str, Any] = Field(default_factory=dict, 
                                         description="Job configuration")
    
    # Mutable job state
    status: JobStatus = Field(JobStatus.CREATED, description="Current status of the job")
    service_job_id: Optional[str] = Field(None, description="Job ID in the C4H service")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    submitted_at: Optional[datetime] = Field(None, description="When job was submitted to service")
    completed_at: Optional[datetime] = Field(None)
    user_id: Optional[str] = Field(None, description="User who submitted the job")
    configuration: Dict[str, Any] = Field(default_factory=dict, description="Job configuration")
    result: Optional[JobResult] = Field(None, description="Job execution result")
    
    def update_status(self, status: JobStatus, result: Optional[Dict[str, Any]] = None):
        """Update the status of the job."""
        self.status = status
        old_status = self.status
        self.updated_at = datetime.now(UTC)
        
        if status == JobStatus.SUBMITTED and not self.submitted_at:
            self.submitted_at = datetime.now(UTC)
            
        if status in (JobStatus.COMPLETED, JobStatus.FAILED) and not self.completed_at:
            self.completed_at = datetime.now(UTC)
            
        # Create status change event
        status_event = StatusChangeEvent(
            old_status=old_status,
            new_status=status)
            
        if result and (status == JobStatus.COMPLETED or status == JobStatus.FAILED):
            self.result = JobResult(**result)

    def get_configuration_ids(self) -> Dict[str, str]:
        """Get a map of configuration types to IDs."""
        return {config_type: config_ref.id for config_type, config_ref in self.configurations.items()}


class JobAuditLog(BaseModel):
    """Audit log for a job with history of all changes."""
    job_id: str = Field(..., description="ID of the job")
    entries: List[JobHistoryEntry] = Field(default_factory=list, description="History entries")
    
    def add_entry(self, event_type: str, user_id: Optional[str] = None, 
                 details: Optional[Dict[str, Any]] = None,
                 metadata: Optional[Dict[str, Any]] = None):
        """Add an entry to the audit log."""
        entry = JobHistoryEntry(
            event_type=event_type,
            user_id=user_id,
            details=details or {},
            metadata=metadata or {},
        )
        self.entries.append(entry)
        return entry