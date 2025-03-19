#!/usr/bin/env python
# Script to create base configuration models

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

# Create configuration.py
config_model_path = models_dir / "configuration.py"
with open(config_model_path, "w") as f:
    f.write("""# backend/models/configuration.py
\"\"\"
Base model for configurations in the C4H Editor.
Provides common structure and functionality for all configuration types.
\"\"\"

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

class ConfigurationMetadata(BaseModel):
    \"\"\"Common metadata for all configuration types.\"\"\"
    author: str = Field(..., description="Author of the configuration")
    archived: bool = Field(False, description="Whether the configuration is archived")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = Field(None, description="Description of the configuration")
    tags: List[str] = Field(default_factory=list, description="Tags for categorizing configurations")
    version: str = Field("1.0.0", description="Semantic version of the configuration")

class Configuration(BaseModel):
    \"\"\"Base model for all configuration types.\"\"\"
    id: str = Field(..., description="Unique identifier for the configuration")
    config_type: str = Field(..., description="Type of configuration (workorder, teamconfig, etc.)")
    content: Dict[str, Any] = Field(..., description="Configuration content specific to the type")
    metadata: ConfigurationMetadata = Field(..., description="Configuration metadata")
    parent_id: Optional[str] = Field(None, description="ID of the parent configuration if this is derived")
    lineage: List[str] = Field(default_factory=list, description="Lineage chain of configuration IDs")

    def validate_content(self) -> bool:
        \"\"\"
        Validate configuration content against schema.
        This should be overridden by specific configuration types.
        
        Returns:
            True if valid, raises ValueError otherwise
        \"\"\"
        # Base implementation just returns True
        # Specific types should implement schema validation
        return True

class ConfigurationVersion(BaseModel):
    \"\"\"Information about a specific version of a configuration.\"\"\"
    config_id: str = Field(..., description="Configuration identifier")
    config_type: str = Field(..., description="Configuration type")
    version: str = Field(..., description="Version string")
    commit_hash: str = Field(..., description="Git commit hash")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    author: str = Field(..., description="Author of the commit")
    message: str = Field(..., description="Commit message")
    configuration: Configuration = Field(..., description="The configuration at this version")
""")

print(f"Created {config_model_path}")

# Update job.py to support multiple configurations
job_model_path = models_dir / "job.py"
if job_model_path.exists():
    with open(job_model_path, "r") as f:
        content = f.read()
    
    # Create updated job.py with support for multiple configurations
    with open(job_model_path, "w") as f:
        f.write("""# backend/models/job.py
\"\"\"Job model for tracking configuration job submissions to C4H service.\"\"\"

from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    \"\"\"Status of a job.\"\"\"
    CREATED = "created"
    SUBMITTED = "submitted"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobResult(BaseModel):
    \"\"\"Result of a job execution.\"\"\"
    output: Optional[str] = Field(None, description="Output text or content")
    artifacts: List[Dict[str, Any]] = Field(default_factory=list, description="Artifacts produced")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Execution metrics")
    error: Optional[str] = Field(None, description="Error message if job failed")


class ConfigReference(BaseModel):
    \"\"\"Reference to a specific configuration.\"\"\"
    id: str = Field(..., description="Identifier of the configuration")
    version: str = Field(..., description="Version of the configuration")


class Job(BaseModel):
    \"\"\"Job represents a configuration tuple submission to the C4H service.\"\"\"
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
        \"\"\"Update the status of the job.\"\"\"
        self.status = status
        self.updated_at = datetime.utcnow()
        
        if status == JobStatus.SUBMITTED and not self.submitted_at:
            self.submitted_at = datetime.utcnow()
            
        if status in (JobStatus.COMPLETED, JobStatus.FAILED) and not self.completed_at:
            self.completed_at = datetime.utcnow()
            
        if result and (status == JobStatus.COMPLETED or status == JobStatus.FAILED):
            self.result = JobResult(**result)

    def get_configuration_ids(self) -> Dict[str, str]:
        \"\"\"Get a map of configuration types to IDs.\"\"\"
        return {config_type: config_ref.id for config_type, config_ref in self.configurations.items()}
""")

    print(f"Updated {job_model_path}")

print("Base Configuration Models created successfully.")