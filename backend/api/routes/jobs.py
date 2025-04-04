"""API routes for job management with multiple configurations."""

from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import traceback
from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body, BackgroundTasks
from pydantic import BaseModel, Field

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
    """Reference to a configuration used in a job"""
    id: str = Field(..., description="Configuration ID")
    config_type: str = Field(..., description="Configuration type (workorder, team, runtime)")
    name: Optional[str] = Field(None, description="Optional display name")
    version: Optional[str] = None


class JobSubmitRequest(BaseModel):  # Legacy request format
    configurations: Dict[str, JobConfigReference]
    user_id: Optional[str] = None
    job_configuration: Optional[Dict[str, Any]] = None


class JobTupleRequest(BaseModel):
    """C4H Services API compatible job request with required configuration tuple"""
    workorder: JobConfigReference = Field(..., description="Work order configuration")
    team: JobConfigReference = Field(..., description="Team configuration")
    runtime: JobConfigReference = Field(..., description="Runtime configuration")
    user_id: Optional[str] = Field(None, description="User ID")
    job_configuration: Optional[Dict[str, Any]] = Field(None, description="Job-specific configuration")


class JobResponse(BaseModel):  
    """Job response model"""
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


# Primary job submission endpoint - uses the tuple-based API
@router.post("", response_model=JobResponse)
async def submit_job_tuple(
    request: JobTupleRequest,
    background_tasks: BackgroundTasks,
    job_repo: JobRepository = Depends(get_job_repository),
    c4h_service: C4HService = Depends(get_c4h_service)
): 
    """Submit a job with required configuration tuple (workorder, team, runtime) to the C4H service."""
    try:
        # Format configurations for job repository
        configurations = {
            request.workorder.config_type: {"id": request.workorder.id, "version": request.workorder.version or "latest"},
            request.team.config_type: {"id": request.team.id, "version": request.team.version or "latest"},
            request.runtime.config_type: {"id": request.runtime.id, "version": request.runtime.version or "latest"}
        }
        
        # Validate configuration types
        required_types = ["workorder", "teamconfig", "runtimeconfig"]
        config_types = [request.workorder.config_type, request.team.config_type, request.runtime.config_type]
        
        # Check that we have all required types
        for required_type in required_types:
            if required_type not in config_types:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required configuration type: {required_type}"
                )
        
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
                workorder_config = get_config_repository(request.workorder.config_type).get_config(
                    request.workorder.id, request.workorder.version
                )
                team_config = get_config_repository(request.team.config_type).get_config(
                    request.team.id, request.team.version
                )
                runtime_config = get_config_repository(request.runtime.config_type).get_config(
                    request.runtime.id, request.runtime.version
                )
                
                # Submit to service with correct configuration tuple
                submission = await c4h_service.submit_job(
                    workorder=workorder_config,
                    team=team_config, 
                    runtime=runtime_config 
                )
                
                # Update job record with service response
                if submission.status == "error":
                    job.update_status(JobStatus.FAILED) 
                    job.result = JobResult(
                        error=submission.message or "Failed to submit job to service"
                    )
                else:
                    job.service_job_id = submission.job_id
                    job.update_status(JobStatus.SUBMITTED)
                
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


@router.post("", response_model=JobResponse)
async def submit_job(
    request: JobSubmitRequest,
    background_tasks: BackgroundTasks,
    job_repo: JobRepository = Depends(get_job_repository),
    c4h_service: C4HService = Depends(get_c4h_service)
):
    """[DEPRECATED] Submit a job with multiple configurations to the C4H service."""
    try: 
        # Validate configuration types
        config_types = get_config_types()
        for config_type in request.configurations.keys():
            # Log warning - old method is deprecated
            logger.warning(f"Using deprecated job submission API - please migrate to the tuple-based API")
            
            # Check if config type is valid
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
                try:
                    # Map old format to new format to maintain backward compatibility
                    workorder = get_config_repository("workorder").get_config(
                        job.configurations["workorder"].id, job.configurations["workorder"].version
                    ) if "workorder" in job.configurations else None
                    
                    team = get_config_repository("teamconfig").get_config(
                        job.configurations["teamconfig"].id, job.configurations["teamconfig"].version
                    ) if "teamconfig" in job.configurations else None
                    
                    runtime = get_config_repository("runtimeconfig").get_config(
                        job.configurations["runtimeconfig"].id, job.configurations["runtimeconfig"].version
                    ) if "runtimeconfig" in job.configurations else None
                    
                    # Verify we have all required configs
                    if not workorder or not team or not runtime:
                        raise ValueError("Missing required configuration(s). Need workorder, teamconfig, and runtimeconfig.")
                        
                    # Submit to service
                    submission = await c4h_service.submit_job(
                        workorder=workorder,
                        team=team, 
                        runtime=runtime
                    )
                    
                    # Update job record with service response
                    if submission.status == "error":
                        job.update_status(JobStatus.FAILED)
                        job.result = JobResult(
                            error=submission.message or "Failed to submit job to service"
                        )
                    # Accept both running and processing as active states
                    elif submission.status in ["running", "processing"]:
                        job.update_status(JobStatus.RUNNING)
                    elif submission.status == "cancelled":
                        job.update_status(JobStatus.CANCELLED)
                    else:
                        job.service_job_id = submission.job_id
                        job.update_status(JobStatus.SUBMITTED)
                        
                    logger.info(f"Job {job.id} submitted to service, status: {submission.status}")
                except ValueError as ve:
                    job.update_status(JobStatus.FAILED)
                    job.result = JobResult(error=str(ve))
                    job_repo.update_job(job)
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