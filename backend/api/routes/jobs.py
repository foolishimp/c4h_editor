# backend/api/routes/jobs.py
"""API routes for job management with multiple configurations."""

from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import traceback
from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body, BackgroundTasks
from pydantic import BaseModel

from backend.models.job import Job, JobStatus, JobResult, ConfigReference
from backend.services.config_repository import ConfigRepository, get_config_repository
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService
from backend.config.config_types import get_config_types, validate_config_type
from backend.dependencies import get_job_repository, get_c4h_service

# Create logger
logger = logging.getLogger(__name__)

# Create the router object
router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


# Request/Response Models
class JobConfigReference(BaseModel):
    id: str
    version: Optional[str] = None


class JobSubmitRequest(BaseModel):
    configurations: Dict[str, JobConfigReference]
    user_id: Optional[str] = None
    job_configuration: Optional[Dict[str, Any]] = None


class JobResponse(BaseModel):
    id: str
    configurations: Dict[str, Dict[str, str]]
    status: str
    service_job_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    user_id: Optional[str] = None
    job_configuration: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None


class JobListResponse(BaseModel):
    items: List[JobResponse]
    total: int
    offset: int
    limit: int


@router.post("", response_model=JobResponse)
async def submit_job(
    request: JobSubmitRequest,
    background_tasks: BackgroundTasks,
    job_repo: JobRepository = Depends(get_job_repository),
    c4h_service: C4HService = Depends(get_c4h_service)
):
    """Submit a job with multiple configurations to the C4H service."""
    try:
        # Validate configuration types
        config_types = get_config_types()
        for config_type in request.configurations.keys():
            if config_type not in config_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid configuration type: {config_type}"
                )
        
        # Format configurations for job repository
        configurations = {}
        for config_type, config_ref in request.configurations.items():
            configurations[config_type] = {
                "id": config_ref.id,
                "version": config_ref.version or "latest"
            }
        
        # Create job record
        job = job_repo.create_job(
            configurations=configurations,
            user_id=request.user_id,
            configuration=request.job_configuration
        )
        
        # Submit to C4H service asynchronously
        async def submit_and_update():
            try:
                # Load configurations
                configs = {}
                for config_type, config_ref in job.configurations.items():
                    repo = get_config_repository(config_type)
                    config = repo.get_config(config_ref.id, config_ref.version)
                    configs[config_type] = config
                
                # Submit to service
                submission = await c4h_service.submit_job(configs)
                
                # Update job record with service response
                if submission.status == "error":
                    job.update_status(JobStatus.FAILED)
                    job.result = JobResult(
                        error=submission.message or "Failed to submit job to service"
                    )
                else:
                    job.service_job_id = submission.job_id
                    job.update_status(JobStatus.SUBMITTED)
                
                # Save updated job
                job_repo.update_job(job)
                
                logger.info(f"Job {job.id} submitted to service, status: {submission.status}")
            except Exception as e:
                logger.error(f"Error in submit_and_update for job {job.id}: {str(e)}")
                logger.error(traceback.format_exc())
                
                # Update job with error
                job.update_status(JobStatus.FAILED)
                job.result = JobResult(
                    error=f"Error submitting job: {str(e)}"
                )
                job_repo.update_job(job)
        
        # Add submission to background tasks
        background_tasks.add_task(submit_and_update)
        
        # Format response
        configurations_response = {}
        for config_type, config_ref in job.configurations.items():
            configurations_response[config_type] = {
                "id": config_ref.id,
                "version": config_ref.version
            }
        
        # Return the job record
        return JobResponse(
            id=job.id,
            configurations=configurations_response,
            status=job.status.value,
            service_job_id=job.service_job_id,
            created_at=job.created_at,
            updated_at=job.updated_at,
            submitted_at=job.submitted_at,
            completed_at=job.completed_at,
            user_id=job.user_id,
            job_configuration=job.configuration,
            result=job.result.dict() if job.result else None
        )
    except ValueError as e:
        logger.error(f"Value error submitting job: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting job: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to submit job: {str(e)}")


@router.get("", response_model=JobListResponse)
async def list_jobs(
    config_type: Optional[str] = Query(None, description="Filter by config type"),
    config_id: Optional[str] = Query(None, description="Filter by config ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    limit: int = Query(100, ge=1, le=1000, description="Page size limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    job_repo: JobRepository = Depends(get_job_repository)
):
    """List jobs with optional filtering."""
    try:
        # Convert string status to enum if provided
        job_status = None
        if status:
            try:
                job_status = JobStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        # If config_type is provided, validate it
        if config_type:
            try:
                validate_config_type(config_type)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid config type: {config_type}")
        
        # Get jobs
        jobs = job_repo.list_jobs(
            config_type=config_type,
            config_id=config_id,
            status=job_status,
            user_id=user_id,
            limit=limit,
            offset=offset
        )
        
        # Get total count
        total = job_repo.count_jobs(
            config_type=config_type,
            config_id=config_id,
            status=job_status,
            user_id=user_id
        )
        
        # Convert to response objects
        job_responses = []
        for job in jobs:
            # Format configurations
            configurations_response = {}
            for config_type, config_ref in job.configurations.items():
                configurations_response[config_type] = {
                    "id": config_ref.id,
                    "version": config_ref.version
                }
            
            job_responses.append(JobResponse(
                id=job.id,
                configurations=configurations_response,
                status=job.status.value,
                service_job_id=job.service_job_id,
                created_at=job.created_at,
                updated_at=job.updated_at,
                submitted_at=job.submitted_at,
                completed_at=job.completed_at,
                user_id=job.user_id,
                job_configuration=job.configuration,
                result=job.result.dict() if job.result else None
            ))
        
        return JobListResponse(
            items=job_responses,
            total=total,
            offset=offset,
            limit=limit
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing jobs: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to list jobs: {str(e)}")


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str = Path(..., description="ID of the job"),
    job_repo: JobRepository = Depends(get_job_repository),
    c4h_service: C4HService = Depends(get_c4h_service)
):
    """Get a job by ID."""
    try:
        # Get job from repository
        job = job_repo.get_job(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        # Update job status from service if needed
        if job.status in (JobStatus.SUBMITTED, JobStatus.RUNNING) and job.service_job_id:
            try:
                # Check status from service
                status_response = await c4h_service.get_job_status(job.service_job_id)
                
                # Map service status to our status
                service_status = status_response.status.lower()
                
                if service_status == "completed":
                    job.update_status(JobStatus.COMPLETED)
                    if status_response.result:
                        job.result = JobResult(
                            output=status_response.result.get("output"),
                            artifacts=status_response.result.get("artifacts", []),
                            metrics=status_response.result.get("metrics", {})
                        )
                elif service_status == "failed":
                    job.update_status(JobStatus.FAILED)
                    job.result = JobResult(
                        error=status_response.error or "Job failed in service"
                    )
                elif service_status == "running":
                    job.update_status(JobStatus.RUNNING)
                elif service_status == "cancelled":
                    job.update_status(JobStatus.CANCELLED)
                
                # Save updated job
                job_repo.update_job(job)
            except Exception as e:
                logger.error(f"Error updating job status from service: {str(e)}")
                # Continue with existing job data
        
        # Format configurations
        configurations_response = {}
        for config_type, config_ref in job.configurations.items():
            configurations_response[config_type] = {
                "id": config_ref.id,
                "version": config_ref.version
            }
        
        # Return job response
        return JobResponse(
            id=job.id,
            configurations=configurations_response,
            status=job.status.value,
            service_job_id=job.service_job_id,
            created_at=job.created_at,
            updated_at=job.updated_at,
            submitted_at=job.submitted_at,
            completed_at=job.completed_at,
            user_id=job.user_id,
            job_configuration=job.configuration,
            result=job.result.dict() if job.result else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get job: {str(e)}")


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(
    job_id: str = Path(..., description="ID of the job"),
    job_repo: JobRepository = Depends(get_job_repository),
    c4h_service: C4HService = Depends(get_c4h_service)
):
    """Cancel a job."""
    try:
        # Get job from repository
        job = job_repo.get_job(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        # Check if job can be cancelled
        if job.status not in (JobStatus.CREATED, JobStatus.SUBMITTED, JobStatus.RUNNING):
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot cancel job in {job.status.value} status"
            )
        
        # Cancel in service if submitted
        if job.service_job_id and job.status in (JobStatus.SUBMITTED, JobStatus.RUNNING):
            cancelled = await c4h_service.cancel_job(job.service_job_id)
            if not cancelled:
                logger.warning(f"Failed to cancel job {job_id} in service")
        
        # Update job status regardless of service response
        job.update_status(JobStatus.CANCELLED)
        job_repo.update_job(job)
        
        logger.info(f"Cancelled job {job_id}")
        
        # Format configurations
        configurations_response = {}
        for config_type, config_ref in job.configurations.items():
            configurations_response[config_type] = {
                "id": config_ref.id,
                "version": config_ref.version
            }
        
        # Return updated job
        return JobResponse(
            id=job.id,
            configurations=configurations_response,
            status=job.status.value,
            service_job_id=job.service_job_id,
            created_at=job.created_at,
            updated_at=job.updated_at,
            submitted_at=job.submitted_at,
            completed_at=job.completed_at,
            user_id=job.user_id,
            job_configuration=job.configuration,
            result=job.result.dict() if job.result else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to cancel job: {str(e)}")
