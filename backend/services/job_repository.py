"""Repository for storing and retrieving jobs with multiple configurations."""

import os
import json
import logging
from datetime import datetime, UTC
from typing import Dict, List, Optional, Any, Set, Tuple
from pathlib import Path
import uuid
import shutil

from backend.models.job import Job, JobStatus, JobResult, ConfigReference, JobAuditLog
from backend.models.job import JobHistoryEntry, StatusChangeEvent
from backend.config.config_types import get_config_types

logger = logging.getLogger(__name__)


class JobRepository:
    """Repository for storing and retrieving jobs."""
    
    def __init__(self, storage_path: str = "./data/jobs"):
        """Initialize the job repository."""
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Job repository initialized with storage path: {storage_path}")
        
        # Create subdirectories
        self.jobs_path = self.storage_path / "jobs"
        self.audit_path = self.storage_path / "audit"
        self.backup_path = self.storage_path / "backups"
        
        self.jobs_path.mkdir(exist_ok=True)
        self.audit_path.mkdir(exist_ok=True)
        self.backup_path.mkdir(exist_ok=True)
    
    def _get_job_path(self, job_id: str) -> Path:
        """Get the file path for a job."""
        return self.jobs_path / f"{job_id}.json"
    
    def _get_audit_path(self, job_id: str) -> Path:
        """Get the file path for a job's audit log."""
        return self.audit_path / f"{job_id}_audit.json"
    
    def _serialize_job(self, job: Job) -> Dict[str, Any]:
        """Serialize a job to a dictionary."""
        return json.loads(job.json())
    
    def create_job(self, 
                  configurations: Dict[str, Dict[str, str]],
                  user_id: Optional[str] = None,
                  configuration: Optional[Dict[str, Any]] = None) -> Job:
        """
        Create a new job with multiple configurations.
        
        Args:
            configurations: Dict mapping config_type to {"id": config_id, "version": version}
            user_id: Optional user ID
            configuration: Optional job configuration
            
        Returns:
            Created job
        """
        # Validate configurations
        self._validate_configurations(configurations)
        
        # Create timestamp for all events to ensure consistency
        now = datetime.now(UTC)
        
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Convert configurations to ConfigReference objects
        config_refs = {}
        for config_type, config_info in configurations.items():
            config_refs[config_type] = ConfigReference(
                id=config_info["id"],
                version=config_info.get("version", "latest")
            )
        
        # Create job
        job = Job(
            id=job_id,
            configurations=config_refs,
            status=JobStatus.CREATED,
            created_at=now,
            updated_at=now,
            user_id=user_id,
            configuration=configuration or {}
        )
        
        # Save to file
        job_path = self._get_job_path(job_id)
        
        # Create audit log with creation event
        audit_log = JobAuditLog(job_id=job_id)
        audit_log.add_entry(
            event_type="job_created",
            user_id=user_id,
            details={"configurations": {k: v.dict() for k, v in config_refs.items()}}
        )
        
        with open(job_path, "w") as f:
            json.dump(self._serialize_job(job), f, indent=2)
        
        logger.info(f"Created job {job_id} with configurations: {list(configurations.keys())}")
        
        return job
    
    def _deserialize_job(self, data: Dict[str, Any]) -> Job:
        """Deserialize a dictionary to a job."""
        try:
            # Handle datetime fields specifically
            for field in ['created_at', 'updated_at', 'submitted_at', 'completed_at']:
                if field in data and data[field] is not None:
                    if isinstance(data[field], str):
                        try:
                            data[field] = datetime.fromisoformat(data[field])
                        except ValueError:
                            # Handle old format without timezone
                            data[field] = datetime.fromisoformat(data[field].replace('Z', '+00:00'))
            
            return Job(**data)
        except Exception as e:
            logger.error(f"Error deserializing job: {e}")
            raise ValueError(f"Invalid job data: {e}")
            
    def _deserialize_audit_log(self, data: Dict[str, Any]) -> JobAuditLog:
        """Deserialize a dictionary to an audit log."""
        try:
            # Process entries to handle datetime conversions
            if 'entries' in data:
                for entry in data['entries']:
                    if 'timestamp' in entry and isinstance(entry['timestamp'], str):
                        try:
                            entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])
                        except ValueError:
                            # Handle old format without timezone
                            entry['timestamp'] = datetime.fromisoformat(entry['timestamp'].replace('Z', '+00:00'))
            
            return JobAuditLog(**data)
        except Exception as e:
            logger.error(f"Error deserializing audit log: {e}")
            raise ValueError(f"Invalid audit log data: {e}")
            
    def _validate_configurations(self, configurations: Dict[str, Dict[str, str]]) -> bool:
        """
        Validate that all required configuration types are present.
        
        Args:
            configurations: Dict mapping config_type to {"id": config_id, "version": version}
            
        Returns:
            True if valid, raises ValueError otherwise
        """
        # Get registered config types
        registered_types = set(get_config_types().keys())
        
        # Check that all provided types are valid
        for config_type in configurations.keys():
            if config_type not in registered_types:
                raise ValueError(f"Invalid configuration type: {config_type}")
                
            # Validate that id is provided
            if "id" not in configurations[config_type]:
                raise ValueError(f"Missing 'id' for configuration type: {config_type}")
        
        # Make sure all required types are present
        # In a real implementation, this might check for mandatory config types
        # or configurations required for specific service types
        
        return True
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by ID."""
        job_path = self._get_job_path(job_id)
        
        if not job_path.exists():
            logger.warning(f"Job {job_id} not found")
            return None
        
        with open(job_path, "r") as f:
            data = json.load(f)
        
        job = self._deserialize_job(data)
        
        return job
    
    def update_job(self, job: Job, user_id: Optional[str] = None, 
                  add_audit_entry: bool = True) -> Job:
        """Update a job."""
        job_path = self._get_job_path(job.id)
        
        if not job_path.exists():
            logger.warning(f"Job {job.id} not found for update")
            raise ValueError(f"Job {job.id} not found")
            
        # Create backup of current job state
        self._backup_job_file(job.id)
            
        # Get previous state to compare
        try:
            previous_job = self.get_job(job.id)
            
            # If status has changed, record in audit log
            if add_audit_entry and previous_job.status != job.status:
                audit_log = self.get_job_audit_log(job.id)
                if not audit_log:
                    audit_log = JobAuditLog(job_id=job.id)
                
                audit_log.add_entry(
                    event_type="status_change",
                    user_id=user_id,
                    details={
                        "old_status": previous_job.status.value,
                        "new_status": job.status.value
                    }
                )
                
                self.update_job_audit_log(audit_log)
        except Exception as e:
            logger.warning(f"Could not compare with previous job state: {e}")
            # Continue with update even if comparison fails
        
        # Update timestamp
        job.updated_at = datetime.now(UTC)
        
        # Save to file
        with open(job_path, "w") as f:
            json.dump(self._serialize_job(job), f, indent=2)
        
        logger.info(f"Updated job {job.id}, status: {job.status}")
        
        return job
        
    def _backup_job_file(self, job_id: str) -> Optional[Path]:
        """Create a backup of the job file before modification."""
        job_path = self._get_job_path(job_id)
        if not job_path.exists():
            return None
            
        # Create timestamped backup
        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_path / f"{job_id}_{timestamp}.json"
        
        try:
            shutil.copy2(job_path, backup_file)
            return backup_file
        except Exception as e:
            logger.warning(f"Failed to create backup of job {job_id}: {e}")
            return None
    
    def delete_job(self, job_id: str) -> bool:
        """Delete a job."""
        job_path = self._get_job_path(job_id)
        
        if not job_path.exists():
            logger.warning(f"Job {job_id} not found for deletion")
            return False
        
        # Delete file
        job_path.unlink()
        
        logger.info(f"Deleted job {job_id}")
        
        return True
    
    def get_job_audit_log(self, job_id: str) -> Optional[JobAuditLog]:
        """Get the audit log for a job."""
        audit_path = self._get_audit_path(job_id)
        
        if not audit_path.exists():
            logger.info(f"No audit log found for job {job_id}")
            return None
            
        with open(audit_path, "r") as f:
            data = json.load(f)
            
        return self._deserialize_audit_log(data)
        
    def update_job_audit_log(self, audit_log: JobAuditLog) -> None:
        """Update the audit log for a job."""
        audit_path = self._get_audit_path(audit_log.job_id)
        
        # Create backup if file exists
        if audit_path.exists():
            timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
            backup_file = self.backup_path / f"{audit_log.job_id}_audit_{timestamp}.json"
            try:
                shutil.copy2(audit_path, backup_file)
            except Exception as e:
                logger.warning(f"Failed to create backup of audit log for job {audit_log.job_id}: {e}")
        
        # Save updated audit log
        with open(audit_path, "w") as f:
            json.dump(json.loads(audit_log.json()), f, indent=2)
        
        logger.info(f"Updated audit log for job {audit_log.job_id}")
    
    def list_jobs(self, 
                 config_type: Optional[str] = None,
                 config_id: Optional[str] = None,
                 status: Optional[JobStatus] = None,
                 user_id: Optional[str] = None,
                 limit: int = 100,
                 offset: int = 0) -> List[Job]:
        """
        List jobs with optional filtering.
        
        Args:
            config_type: Optional configuration type to filter by
            config_id: Optional configuration ID to filter by
            status: Optional status to filter by
            user_id: Optional user ID to filter by
            limit: Maximum number of jobs to return
            offset: Offset for pagination
            
        Returns:
            List of jobs
        """
        jobs = []
        
        # Find all JSON files in directory
        for job_file in self.jobs_path.glob("*.json"):
            if not job_file.is_file():
                continue
            
            try:
                with open(job_file, "r") as f:
                    data = json.load(f)

                # Filter out audit/backup files
                if "_audit" in job_file.name or "_backup" in job_file.name:
                    continue

                job = self._deserialize_job(data)
                
                # Apply filters
                if config_type and config_id:
                    # Check if job has this configuration
                    if (config_type not in job.configurations or 
                        job.configurations[config_type].id != config_id):
                        continue
                elif config_type:
                    # Check if job has this configuration type
                    if config_type not in job.configurations:
                        continue
                
                if status and job.status != status:
                    continue
                
                if user_id and job.user_id != user_id:
                    continue
                
                jobs.append(job)
            except Exception as e:
                logger.error(f"Error loading job file {job_file}: {str(e)}")
                continue
        
        # Sort by created time (newest first)
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        
        # Apply pagination
        paginated_jobs = jobs[offset:offset+limit]
        
        logger.info(f"Listed {len(paginated_jobs)} jobs (total: {len(jobs)})")
        
        return paginated_jobs
    
    def count_jobs(self, 
                  config_type: Optional[str] = None,
                  config_id: Optional[str] = None,
                  status: Optional[JobStatus] = None,
                  user_id: Optional[str] = None) -> int:
        """Count jobs with optional filtering."""
        count = 0
        
        # Find all JSON files in directory
        for job_file in self.jobs_path.glob("*.json"):
            if not job_file.is_file():
                continue
            
            try:
                with open(job_file, "r") as f:
                    data = json.load(f)
                
                # Filter out audit/backup files
                if "_audit" in job_file.name or "_backup" in job_file.name:
                    continue
                    
                job = self._deserialize_job(data)
                
                
                # Apply filters
                if config_type and config_id:
                    # Check if job has this configuration
                    if (config_type not in job.configurations or 
                        job.configurations[config_type].id != config_id):
                        continue
                elif config_type:
                    # Check if job has this configuration type
                    if config_type not in job.configurations:
                        continue
                
                if status and job.status != status:
                    continue
                
                if user_id and job.user_id != user_id:
                    continue
                
                count += 1
            except Exception as e:
                logger.error(f"Error loading job file {job_file}: {str(e)}")
                continue
        
        return count
        
    def get_job_history(self, job_id: str) -> List[Dict[str, Any]]:
        """
        Get complete history of a job including status changes and updates.
        Combines information from job file and audit log.
        
        Args:
            job_id: ID of the job
            
        Returns:
            List of history events in chronological order
        """       
        # Get job information
        job = self.get_job(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
            
        # Initialize events list
        events = []
            
        # Add job creation event
        events.append({
            "timestamp": job.created_at.isoformat(),
            "event_type": "job_created",
            "details": {"status": JobStatus.CREATED.value}
        })
        
        # Get audit log entries
        audit_log = self.get_job_audit_log(job_id)
        if audit_log:
            for entry in audit_log.entries:
                events.append(entry.dict() | {"timestamp": entry.timestamp.isoformat()})
                
        # Sort by timestamp
        return sorted(events, key=lambda e: e["timestamp"])