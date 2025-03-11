# File: backend/services/job_repository.py
"""Repository for storing and retrieving jobs."""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
import uuid

from backend.models.job import Job, JobStatus, JobResult

logger = logging.getLogger(__name__)


class JobRepository:
    """Repository for storing and retrieving jobs."""
    
    def __init__(self, storage_path: str = "./data/jobs"):
        """Initialize the job repository."""
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Job repository initialized with storage path: {storage_path}")
    
    def _get_job_path(self, job_id: str) -> Path:
        """Get the file path for a job."""
        return self.storage_path / f"{job_id}.json"
    
    def _serialize_job(self, job: Job) -> Dict[str, Any]:
        """Serialize a job to a dictionary."""
        return json.loads(job.json())
    
    def _deserialize_job(self, data: Dict[str, Any]) -> Job:
        """Deserialize a dictionary to a job."""
        return Job(**data)
    
    def create_job(self, work_order_id: str, work_order_version: str, 
                  user_id: Optional[str] = None, 
                  configuration: Optional[Dict[str, Any]] = None) -> Job:
        """Create a new job."""
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Create job
        job = Job(
            id=job_id,
            work_order_id=work_order_id,
            work_order_version=work_order_version,
            status=JobStatus.CREATED,
            user_id=user_id,
            configuration=configuration or {}
        )
        
        # Save to file
        job_path = self._get_job_path(job_id)
        with open(job_path, "w") as f:
            json.dump(self._serialize_job(job), f, indent=2)
        
        logger.info(f"Created job {job_id} for work order {work_order_id}")
        
        return job
    
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
    
    def update_job(self, job: Job) -> Job:
        """Update a job."""
        job_path = self._get_job_path(job.id)
        
        if not job_path.exists():
            logger.warning(f"Job {job.id} not found for update")
            raise ValueError(f"Job {job.id} not found")
        
        # Update timestamp
        job.updated_at = datetime.utcnow()
        
        # Save to file
        with open(job_path, "w") as f:
            json.dump(self._serialize_job(job), f, indent=2)
        
        logger.info(f"Updated job {job.id}, status: {job.status}")
        
        return job
    
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
    
    def list_jobs(self, work_order_id: Optional[str] = None, 
                 status: Optional[JobStatus] = None,
                 user_id: Optional[str] = None,
                 limit: int = 100,
                 offset: int = 0) -> List[Job]:
        """List jobs with optional filtering."""
        jobs = []
        
        # Find all JSON files in directory
        for job_file in self.storage_path.glob("*.json"):
            if not job_file.is_file():
                continue
            
            try:
                with open(job_file, "r") as f:
                    data = json.load(f)
                
                job = self._deserialize_job(data)
                
                # Apply filters
                if work_order_id and job.work_order_id != work_order_id:
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
    
    def count_jobs(self, work_order_id: Optional[str] = None, 
                  status: Optional[JobStatus] = None,
                  user_id: Optional[str] = None) -> int:
        """Count jobs with optional filtering."""
        count = 0
        
        # Find all JSON files in directory
        for job_file in self.storage_path.glob("*.json"):
            if not job_file.is_file():
                continue
            
            try:
                with open(job_file, "r") as f:
                    data = json.load(f)
                
                job = self._deserialize_job(data)
                
                # Apply filters
                if work_order_id and job.work_order_id != work_order_id:
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