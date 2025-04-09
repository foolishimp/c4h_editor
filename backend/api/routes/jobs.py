# File: /Users/jim/src/apps/c4h_editor/backend/api/routes/jobs.py
# (Full updated file content - CORRECTED list_jobs to check status)

"""API routes for job management with multiple configurations."""

from typing import List, Dict, Any, Optional
from datetime import datetime, UTC # Ensure UTC is imported
import logging
import traceback
import asyncio
from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body, BackgroundTasks
from pydantic import BaseModel, Field, validator

# --- Ensure these imports point to models/services WITHIN the editor's backend codebase ---
# Adjust paths if your structure differs slightly
from backend.models.job import Job, JobStatus, JobResult, ConfigReference, JobAuditLog, JobHistoryEntry
from backend.services.config_repository import ConfigRepository, get_config_repository
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService, JobStatusResponse # Ensure JobStatusResponse is imported
from backend.config.config_types import get_config_types, validate_config_type
from backend.dependencies import get_job_repository, get_c4h_service
from backend.models.job import StatusChangeEvent # Import if used in update_job

# --- Logger setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- API Router ---
router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])

# --- Pydantic Models ---
# (Ensure these match your actual definitions)
class JobConfigReference(BaseModel):
    id: str = Field(...)
    config_type: str = Field(...)
    name: Optional[str] = None
    version: Optional[str] = None
    @validator('config_type')
    def validate_cfg_type(cls, v):
        valid = ['workorder', 'teamconfig', 'runtimeconfig']
        if v not in valid: raise ValueError(f"config_type must be one of {valid}")
        return v

class JobTupleRequest(BaseModel):
    workorder: JobConfigReference; team: JobConfigReference; runtime: JobConfigReference
    user_id: Optional[str] = None; job_configuration: Optional[Dict[str, Any]] = None

class JobResponse(BaseModel):
    id: str; configurations: Dict[str, Dict[str, str]]; status: str
    service_job_id: Optional[str] = None; created_at: datetime; updated_at: datetime
    submitted_at: Optional[datetime] = None; completed_at: Optional[datetime] = None
    user_id: Optional[str] = None; job_configuration: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None; changes: Optional[List[Dict[str, Any]]] = None

class JobListInfo(BaseModel):
     id: str; configurations: Dict[str, Dict[str, str]]; status: str
     created_at: datetime; updated_at: datetime; user_id: Optional[str] = None

class JobListResponse(BaseModel):
    items: List[JobListInfo]; total: int; offset: int; limit: int

# --- Utility Function & Global Storage ---
workflow_storage: Dict[str, Dict[str, Any]] = {}
job_to_workflow_map: Dict[str, str] = {}
def map_workflow_to_job_changes(workflow_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    # (Implementation from previous response - unchanged)
    try:
        changes=workflow_data.get('changes') or workflow_data.get('data',{}).get('changes')
        if not changes and 'team_results' in workflow_data and 'coder' in workflow_data['team_results']:
             coder_res=workflow_data['team_results']['coder']
             changes=coder_res.get('data',{}).get('changes')
        if not changes or not isinstance(changes,list): return []
        formatted=[]
        for ch in changes:
             if isinstance(ch,dict):
                  fc={}; path_keys=['file','file_path','path']
                  for k in path_keys:
                       if k in ch: fc['file']=ch[k]; break
                  if 'file' not in fc: continue
                  if 'change' in ch: fc['change']=ch['change']
                  elif 'type' in ch or 'success' in ch:
                       st='success' if ch.get('success',True) else 'error'
                       info={'status':st,'type':ch.get('type','unknown')}
                       if 'error' in ch and ch['error']: info['error']=ch['error']
                       fc['change']=info
                  else: fc['change']={'status':'unknown'}
                  formatted.append(fc)
        return formatted
    except Exception as e: logger.error("jobs.mapping.changes_failed",error=str(e),exc_info=True); return []

# --- >>> CORRECTED list_jobs FUNCTION (Checks Status) <<< ---
@router.get("", response_model=JobListResponse, summary="List jobs with optional filtering")
async def list_jobs(
    config_type: Optional[str] = Query(None, description="Filter by config type"),
    config_id: Optional[str] = Query(None, description="Filter by config ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    limit: int = Query(100, ge=1, le=1000, description="Page size limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    job_repo: JobRepository = Depends(get_job_repository),
    c4h_service: C4HService = Depends(get_c4h_service) # Add C4HService dependency
):
    """List jobs with optional filtering. Checks status for non-terminal jobs."""
    try:
        job_status: Optional[JobStatus] = None
        if status:
            try: job_status = JobStatus(status.lower())
            except ValueError: raise HTTPException(status_code=400, detail=f"Invalid status value: {status}")
        if config_type:
            try: validate_config_type(config_type)
            except ValueError: raise HTTPException(status_code=400, detail=f"Invalid config type: {config_type}")

        # Get potentially filtered list of job IDs/basic info first if repo supports it efficiently
        # Or get all jobs and filter/update
        jobs: List[Job] = job_repo.list_jobs(
            config_type=config_type, config_id=config_id,
            status=job_status, user_id=user_id,
            limit=limit, offset=offset # Apply pagination early if possible
        )
        total = job_repo.count_jobs( # Get total count based on initial filters
            config_type=config_type, config_id=config_id,
            status=job_status, user_id=user_id
        )

        job_list_items: List[JobListInfo] = []
        non_terminal_statuses = [JobStatus.CREATED, JobStatus.SUBMITTED, JobStatus.RUNNING]

        for job in jobs: # Iterate through the paginated list
            try:
                current_job_status = job.status
                # --- Check status for non-terminal jobs ---
                if job.service_job_id and current_job_status in non_terminal_statuses:
                    logger.debug("jobs.list.checking_service_status", extra={"job_id": job.id, "service_job_id": job.service_job_id})
                    try:
                        status_response: JobStatusResponse = await c4h_service.get_job_status(job.service_job_id)
                        service_status_str = status_response.status.lower()
                        status_mapping = {
                            "completed": JobStatus.COMPLETED, "success": JobStatus.COMPLETED,
                            "failed": JobStatus.FAILED, "error": JobStatus.FAILED,
                            "running": JobStatus.RUNNING, "cancelled": JobStatus.CANCELLED,
                            "submitted": JobStatus.SUBMITTED, "pending": JobStatus.SUBMITTED,
                            "created": JobStatus.CREATED,
                        }
                        new_status = status_mapping.get(service_status_str)

                        if new_status and new_status != current_job_status:
                             logger.info("jobs.list.status_update_from_service", extra={
                                 "job_id": job.id, "old": current_job_status.value, "new": new_status.value})
                             job.update_status(new_status) # Update the job object in memory
                             # Also update results/error if terminal
                             if new_status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                                 service_has_result = status_response.result and new_status == JobStatus.COMPLETED
                                 service_has_error = status_response.error and new_status == JobStatus.FAILED
                                 if service_has_result:
                                     job.result = JobResult(
                                         output=status_response.result.get("output"),
                                         artifacts=status_response.result.get("artifacts", []),
                                         metrics=status_response.result.get("metrics", {}) )
                                 elif service_has_error: job.result = JobResult(error=status_response.error)
                                 else: job.result = None
                             # Persist the change back to the repository
                             if hasattr(job_repo, 'update_job'):
                                 job_repo.update_job(job, add_audit_entry=True)
                             else: logger.error("job_repo.update_job method missing", extra={"job_id": job.id})
                             current_job_status = new_status # Use the updated status for the response

                    except Exception as status_err:
                        logger.error("jobs.list.service_status_fetch_failed", extra={"job_id": job.id, "error": str(status_err)})
                        # Proceed with the locally stored status

                # Format configurations
                configurations_response = {
                     c_type: {"id": ref.id, "version": ref.version}
                     for c_type, ref in job.configurations.items()
                }
                # Append simplified info using the potentially updated status
                job_list_items.append(JobListInfo(
                     id=job.id, configurations=configurations_response,
                     status=current_job_status.value, # Use current_job_status
                     created_at=job.created_at, updated_at=job.updated_at,
                     user_id=job.user_id ))
            except Exception as item_err:
                 logger.error("jobs.list.item_processing_error", extra={"job_id": job.id, "error": str(item_err)}, exc_info=False)

        return JobListResponse(items=job_list_items, total=total, offset=offset, limit=limit)
    except HTTPException: raise
    except Exception as e:
        logger.error("jobs.list.failed", extra={"error": str(e)}, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list jobs: {str(e)}")


# --- MODIFIED get_job FUNCTION (from previous response - unchanged is OK) ---
@router.get("/{job_id}", response_model=JobResponse, summary="Get job details by ID")
async def get_job(
    job_id: str = Path(..., description="ID of the job"),
    job_repo: JobRepository = Depends(get_job_repository),
    c4h_service: C4HService = Depends(get_c4h_service)
):
    """Get a job by ID, always fetching latest status from the underlying C4H service if possible."""
    # (Implementation from previous response is generally correct here)
    try:
        job = job_repo.get_job(job_id)
        if not job: raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

        if job.service_job_id:
            # ... (Status checking logic as before - updates local repo) ...
            logger.debug("jobs.get.checking_service_status", extra={"job_id": job.id, "service_job_id": job.service_job_id, "current_local_status": job.status.value})
            try:
                status_response: JobStatusResponse = await c4h_service.get_job_status(job.service_job_id)
                service_status_str = status_response.status.lower()
                status_mapping = {
                    "completed": JobStatus.COMPLETED, "success": JobStatus.COMPLETED,
                    "failed": JobStatus.FAILED, "error": JobStatus.FAILED,
                    "running": JobStatus.RUNNING, "cancelled": JobStatus.CANCELLED,
                    "submitted": JobStatus.SUBMITTED, "pending": JobStatus.SUBMITTED,
                    "created": JobStatus.CREATED,
                }
                new_status = status_mapping.get(service_status_str)

                update_needed = False
                if new_status and new_status != job.status:
                    update_needed = True
                    logger.info("jobs.get.status_update_from_service", extra={ "job_id": job.id, "old": job.status.value, "new": new_status.value })
                    job.update_status(new_status)

                if new_status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                    current_result_empty = not job.result or (not job.result.output and not job.result.error)
                    service_has_result = status_response.result and new_status == JobStatus.COMPLETED
                    service_has_error = status_response.error and new_status == JobStatus.FAILED
                    if (service_has_result and (current_result_empty or not job.result.output)) or \
                       (service_has_error and (current_result_empty or not job.result.error)):
                        update_needed = True
                        if service_has_result:
                             job.result = JobResult(**status_response.result) # Use ** if result structure matches JobResult
                             logger.info("jobs.get.result_updated_from_service", extra={"job_id": job.id})
                        elif service_has_error:
                             job.result = JobResult(error=status_response.error)
                             logger.info("jobs.get.error_updated_from_service", extra={"job_id": job.id})
                        else: job.result = None

                if update_needed:
                     if hasattr(job_repo, 'update_job'): job_repo.update_job(job, add_audit_entry=True)
                     else: logger.error("job_repo.update_job method missing", extra={"job_id": job.id})

            except Exception as e:
                logger.error("jobs.get.service_status_fetch_failed", extra={"job_id": job.id, "error": str(e)}, exc_info=True)

        configurations_response = {ct: {"id": ref.id, "version": ref.version} for ct, ref in job.configurations.items()}
        workflow_id = job_to_workflow_map.get(job_id)
        workflow_data = workflow_storage.get(workflow_id, {}) if workflow_id else {}
        changes = map_workflow_to_job_changes(workflow_data)
        result_dict = job.result.dict() if job.result else None

        return JobResponse(
            id=job.id, configurations=configurations_response, status=job.status.value, service_job_id=job.service_job_id,
            created_at=job.created_at, updated_at=job.updated_at, submitted_at=job.submitted_at, completed_at=job.completed_at,
            user_id=job.user_id, job_configuration=job.configuration, result=result_dict, changes=changes )
    except HTTPException: raise
    except Exception as e:
        logger.error("jobs.get.failed", extra={"job_id": job_id, "error": str(e)}, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get job: {str(e)}")


# --- MODIFIED submit_and_update FUNCTION (from previous response - unchanged OK) ---
async def submit_and_update(job: Job, job_repo: JobRepository, c4h_service: C4HService, request: JobTupleRequest):
    """Background task to submit job to C4H service and update initial status."""
    # (Implementation from previous response is correct - only sets SUBMITTED)
    try:
        workorder_repo = get_config_repository(request.workorder.config_type)
        team_repo = get_config_repository(request.team.config_type)
        runtime_repo = get_config_repository(request.runtime.config_type)
        if not workorder_repo or not team_repo or not runtime_repo: raise ValueError("Could not get config repositories")

        workorder_config = workorder_repo.get_config(request.workorder.id, request.workorder.version or "latest")
        team_config = team_repo.get_config(request.team.id, request.team.version or "latest")
        runtime_config = runtime_repo.get_config(request.runtime.id, request.runtime.version or "latest")
        if not workorder_config or not team_config or not runtime_config: raise ValueError("Could not load required configs")

        submission = await c4h_service.submit_job(workorder=workorder_config, team=team_config, runtime=runtime_config)

        if submission.status == "error":
            job.update_status(JobStatus.FAILED); job.result = JobResult(error=submission.message or "Failed to submit job to C4H service")
            job_repo.update_job(job, add_audit_entry=True); logger.error("jobs.background.submission_failed", extra={"job_id": job.id, "error": submission.message})
        else:
            job.service_job_id = submission.job_id; job.update_status(JobStatus.SUBMITTED)
            job_repo.update_job(job, add_audit_entry=True); logger.info("jobs.background.submitted_to_service", extra={"job_id": job.id, "service_job_id": submission.job_id, "service_status": submission.status})
    except Exception as e:
        logger.error("jobs.background.submit_and_update_failed", extra={"job_id": job.id, "error": str(e)}, exc_info=True)
        try:
            job.update_status(JobStatus.FAILED); job.result = JobResult(error=f"Background submission failed: {str(e)}")
            job_repo.update_job(job, add_audit_entry=True)
        except Exception as repo_err: logger.error("jobs.background.failed_status_update_failed", extra={"job_id": job.id, "repo_error": str(repo_err)})


# --- create_job endpoint (uses the modified submit_and_update - unchanged OK) ---
@router.post("", response_model=JobResponse)
async def create_job(
    request: JobTupleRequest, background_tasks: BackgroundTasks,
    job_repo: JobRepository = Depends(get_job_repository), c4h_service: C4HService = Depends(get_c4h_service) ):
    # (Implementation from previous response is correct)
    try:
        configurations = { rt.config_type: {"id": rt.id, "version": rt.version or "latest"} for rt in [request.workorder, request.team, request.runtime] }
        required = ["workorder", "teamconfig", "runtimeconfig"]
        for req in required:
             if req not in configurations or not configurations[req].get("id"): raise HTTPException(status_code=400, detail=f"Missing/invalid config for: {req}")
        job = job_repo.create_job(configurations=configurations, user_id=request.user_id, configuration=request.job_configuration)
        logger.info("jobs.create.record_created", extra={"job_id": job.id, "status": job.status.value})
        background_tasks.add_task(submit_and_update, job, job_repo, c4h_service, request)
        configurations_response = { ct: {"id": ref.id, "version": ref.version} for ct, ref in job.configurations.items()}
        result_dict = job.result.dict() if job.result else None
        return JobResponse( id=job.id, configurations=configurations_response, status=job.status.value, service_job_id=job.service_job_id, created_at=job.created_at, updated_at=job.updated_at, submitted_at=job.submitted_at, completed_at=job.completed_at, user_id=job.user_id, job_configuration=job.configuration, result=result_dict, changes=None )
    except ValueError as e: logger.error("jobs.create.validation_error", extra={"error": str(e)}); raise HTTPException(status_code=400, detail=str(e))
    except Exception as e: logger.error("jobs.create.failed", extra={"error": str(e)}, exc_info=True); raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")


# --- cancel_job endpoint (Implementation from previous response - unchanged OK) ---
@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job( job_id: str = Path(...), job_repo: JobRepository = Depends(get_job_repository), c4h_service: C4HService = Depends(get_c4h_service) ):
    # (Implementation from previous response is generally correct)
    job = job_repo.get_job(job_id);
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in [JobStatus.CREATED, JobStatus.SUBMITTED, JobStatus.RUNNING]: raise HTTPException(status_code=400, detail=f"Cannot cancel job in status {job.status.value}")
    cancelled_in_service = False
    if job.service_job_id:
        try: cancelled_in_service = await c4h_service.cancel_job(job.service_job_id)
        except Exception as e: logger.error("jobs.cancel.service_call_failed", extra={"job_id":job_id, "error":str(e)})
    job.update_status(JobStatus.CANCELLED); job_repo.update_job(job, add_audit_entry=True)
    configurations_response = { c_type: {"id": ref.id, "version": ref.version} for c_type, ref in job.configurations.items()}
    result_dict = job.result.dict() if job.result else None
    workflow_id = job_to_workflow_map.get(job_id); workflow_data = workflow_storage.get(workflow_id, {}) if workflow_id else {}
    changes = map_workflow_to_job_changes(workflow_data)
    return JobResponse( id=job.id, configurations=configurations_response, status=job.status.value, service_job_id=job.service_job_id, created_at=job.created_at, updated_at=job.updated_at, submitted_at=job.submitted_at, completed_at=job.completed_at, user_id=job.user_id, job_configuration=job.configuration, result=result_dict, changes=changes )


# --- get_job_history endpoint (Implementation from previous response - unchanged OK) ---
@router.get("/{job_id}/history")
async def get_job_history( job_id: str = Path(...), job_repo: JobRepository = Depends(get_job_repository) ):
    # (Implementation from previous response is generally correct)
    audit_log = job_repo.get_job_audit_log(job_id)
    if not audit_log:
         if not job_repo.get_job(job_id): raise HTTPException(status_code=404, detail="Job not found")
         else: return {"job_id": job_id, "entries": []}
    entries_dict = []
    for entry in audit_log.entries:
         entry_dict = entry.dict()
         if isinstance(entry_dict.get('timestamp'), datetime): entry_dict['timestamp'] = entry_dict['timestamp'].isoformat()
         entries_dict.append(entry_dict)
    return {"job_id": job_id, "entries": entries_dict}

# --- Ensure router is included in the main FastAPI app ---