"""API routes for job management with multiple configurations."""

from typing import List, Dict, Any, Optional
from datetime import datetime, UTC # Ensure UTC is imported
import logging
import traceback
import asyncio
import json
from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body, BackgroundTasks, Request
from pydantic import BaseModel, Field, validator
from functools import cached_property

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

# NEW Model to match frontend payload structure for multi-config endpoint
class JobListRequest(BaseModel):
    configurations: List[JobConfigReference] = Field(..., min_length=1) # Ensure list is not empty
    user_id: Optional[str] = None
    job_configuration: Optional[Dict[str, Any]] = None
    # If overrides are needed, consider how they fit here. They were part of JobTupleRequest.

class JobTupleRequest(BaseModel):
    workorder: JobConfigReference; team: JobConfigReference; runtime: JobConfigReference
    user_id: Optional[str] = None; job_configuration: Optional[Dict[str, Any]] = None
    overrides: Optional[List[Dict[str, Any]]] = Field(None, description="Additional configuration overrides in priority order")
    
    @cached_property
    def all_references(self) -> List[JobConfigReference]:
        """Get all config references from request as a list."""
        refs = []
        if self.workorder: refs.append(self.workorder)
        if self.team: refs.append(self.team)
        if self.runtime: refs.append(self.runtime)
        return refs

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


@router.post("/multi-config", response_model=JobResponse, summary="Create a job with multiple configurations")
async def create_job_multi_config(
    # request: JobTupleRequest, # OLD MODEL
    request: JobListRequest, # NEW MODEL - Use the model matching the frontend
    background_tasks: BackgroundTasks,
    job_repo: JobRepository = Depends(get_job_repository),
    c4h_service: C4HService = Depends(get_c4h_service)
):
    """Create a job with multiple configurations using the new multi-config submission approach."""
    try:
        # Create record first
        configurations = { rt.config_type: {"id": rt.id, "version": rt.version or "latest"} 
                          for rt in request.configurations if rt.id }
        
        required = ["workorder", "teamconfig", "runtimeconfig"]
        for req in required:
            if req not in configurations or not configurations[req].get("id"):
                raise HTTPException(status_code=400, detail=f"Missing/invalid config for: {req}")
        
        # Create job record
        job = job_repo.create_job(configurations=configurations, user_id=request.user_id, 
                                  configuration=request.job_configuration)
        logger.info("jobs.create_multi.record_created", extra={"job_id": job.id, "status": job.status.value})
        
        # --- START CHANGE ---
        # Pass the actual list of references from the request to the background task
        # background_tasks.add_task(submit_multi_configs, job, job_repo, c4h_service, request) # OLD - passing JobTupleRequest
        background_tasks.add_task(submit_multi_configs, job, job_repo, c4h_service, request.configurations) # NEW - passing the list
        # --- END CHANGE ---
        
        # Format response
        configurations_response = {ct: {"id": ref.id, "version": ref.version} for ct, ref in job.configurations.items()}
        result_dict = job.result.dict() if job.result else None
        return JobResponse(id=job.id, configurations=configurations_response, status=job.status.value, service_job_id=job.service_job_id, created_at=job.created_at, updated_at=job.updated_at, submitted_at=job.submitted_at, completed_at=job.completed_at, user_id=job.user_id, job_configuration=job.configuration, result=result_dict, changes=None)
    except ValueError as e: logger.error("jobs.create_multi.validation_error", extra={"error": str(e)}); raise HTTPException(status_code=400, detail=str(e))
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


async def submit_multi_configs(
    job: Job, job_repo: JobRepository, c4h_service: C4HService,
    # request: JobTupleRequest # OLD
    config_references: List[JobConfigReference] # NEW - Accept the list directly
):
    """Background task to submit job with multiple configurations to C4H service."""
    try:
        # 1. Load all configurations and extract their CONTENT for the service payload
        config_list_for_service = [] # List to hold config *content* for the C4H service
        for config_ref in config_references: # NEW - Iterate over the passed list
            if not config_ref or not config_ref.id:
                continue
                
            try:
                repo = get_config_repository(config_ref.config_type)
                # Load the full Pydantic model instance from the editor's repo
                config = repo.get_config(config_ref.id, config_ref.version or "latest")
                
                # --- START CHANGE ---
                # Extract *only* the 'content' part and ensure it's JSON-serializable
                if hasattr(config, 'content'):
                    content_data = config.content
                    # If content itself is a Pydantic model, dump it correctly. Otherwise, assume dict.
                    if hasattr(content_data, 'model_dump'):
                        serializable_content = content_data.model_dump(mode='json')
                    elif isinstance(content_data, dict):
                         # Basic serialization for plain dicts just in case, handles datetimes
                         serializable_content = json.loads(json.dumps(content_data, default=str))
                    else:
                         logger.warning(f"Background: Content for {config_ref.id} is not a dict or Pydantic model, type: {type(content_data)}. Skipping.")
                         continue # Skip if content structure is unexpected

                    config_list_for_service.append(serializable_content)
                # --- END CHANGE ---
                logger.info(f"Background: Added {config_ref.config_type} configuration {config_ref.id}")
            except Exception as e:
                logger.error(f"Background: Failed to load/process {config_ref.config_type} configuration {config_ref.id}: {e}")
                raise # Propagate error to fail the job

        if not config_list_for_service:
             raise ValueError("No valid configuration content could be prepared for submission.")

        # Submit the list containing ONLY the content dictionaries
        submission = await c4h_service.submit_job_with_configs(config_list_for_service)

        # ... rest of the function (updating job status) remains the same ...
        # 3. Update job record with result
        if submission.status == "error":
            job.update_status(JobStatus.FAILED)
            job.result = JobResult(error=submission.message or "Failed to submit job to C4H service")
        else:
            job.service_job_id = submission.job_id
            job.update_status(JobStatus.SUBMITTED)
            logger.info("jobs.background.submitted_to_service", extra={"job_id": job.id, "service_job_id": submission.job_id, "service_status": submission.status})
            
        job_repo.update_job(job, add_audit_entry=True)
        logger.info(f"Multi-config job submission complete: job_id={job.id}, status={job.status.value}")
    except Exception as e:
        logger.error(f"Error in submit_multi_configs: {e}", exc_info=True)
        try: # Attempt to mark job as failed in repo
            job.update_status(JobStatus.FAILED)
            job.result = JobResult(error=f"Background submission task failed: {str(e)}")
            job_repo.update_job(job, add_audit_entry=True)
        except Exception as repo_err:
            logger.error("jobs.background.failed_status_update_failed", extra={"job_id": job.id, "repo_error": str(repo_err)})
# --- Ensure router is included in the main FastAPI app ---