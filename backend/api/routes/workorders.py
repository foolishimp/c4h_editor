# File: backend/api/routes/workorders.py
from typing import List, Dict, Any, Optional
from datetime import datetime
import time
import logging
import traceback
from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body, BackgroundTasks
from pydantic import BaseModel, ValidationError

# Fix imports to use absolute paths instead of relative paths
from backend.models.workorder import WorkOrder, WorkOrderVersion, WorkOrderTestCase, WorkOrderTemplate, WorkOrderMetadata, WorkOrderConfig, WorkOrderParameter
from backend.services.workorder_repository import WorkOrderRepository
from backend.services.lineage_tracker import LineageTracker
from backend.services.llm_service import LLMService, ModelResponse
from backend.dependencies import get_workorder_repository, get_lineage_tracker, get_llm_service

# Create logger
logger = logging.getLogger(__name__)

# Create the router object
router = APIRouter(prefix="/api/v1/workorders", tags=["workorders"])

# Request/Response Models
class WorkOrderCreateRequest(BaseModel):
    id: str
    template: Dict[str, Any]
    metadata: Dict[str, Any]
    commit_message: str
    author: str

class WorkOrderUpdateRequest(BaseModel):
    template: Dict[str, Any]
    metadata: Dict[str, Any]
    commit_message: str
    author: str

class WorkOrderResponse(BaseModel):
    id: str
    version: str
    template: Dict[str, Any]
    metadata: Dict[str, Any]
    commit: str
    updated_at: datetime

class WorkOrderListResponse(BaseModel):
    id: str
    version: str
    title: str
    author: str
    updated_at: str
    last_commit: str
    last_commit_message: str

class WorkOrderHistoryResponse(BaseModel):
    workorder_id: str
    versions: List[Dict[str, Any]]

class WorkOrderTestRequest(BaseModel):
    parameters: Dict[str, Any]
    test_cases: Optional[List[WorkOrderTestCase]] = None
    llm_config: Optional[Dict[str, Any]] = None

class WorkOrderTestResponse(BaseModel):
    workorder_id: str
    rendered_workorder: str
    parameters: Dict[str, Any]
    model_response: Optional[str] = None
    model_info: Optional[Dict[str, Any]] = None
    test_results: Optional[List[Dict[str, Any]]] = None
    execution_time: float
    timestamp: datetime = datetime.utcnow()

@router.post("", response_model=WorkOrderResponse)
async def create_workorder(
    request: WorkOrderCreateRequest,
    repo: WorkOrderRepository = Depends(get_workorder_repository)
):
    """Create a new workorder."""
    try:
        # Log incoming request data for debugging
        logger.info(f"Creating workorder with ID: {request.id}")
        logger.info(f"Template data: {request.template}")
        logger.info(f"Metadata: {request.metadata}")
        
        # Create proper template and metadata objects
        template_data = request.template
        metadata_data = request.metadata
        
        # Process parameters if they exist in template data
        parameters = []
        if "parameters" in template_data:
            for param in template_data.get("parameters", []):
                logger.info(f"Processing parameter: {param}")
                try:
                    parameters.append(WorkOrderParameter(**param))
                except ValidationError as e:
                    logger.error(f"Parameter validation error: {e}")
                    raise ValueError(f"Invalid parameter data: {e}")
        
        # Create WorkOrderTemplate with proper structure
        try:
            # Extract config with default empty dict
            config_data = template_data.get("config", {}) or {}
            logger.info(f"Config data: {config_data}")
            
            # Create config
            config = WorkOrderConfig(**config_data)
            
            template = WorkOrderTemplate(
                text=template_data.get("text", ""),
                parameters=parameters,
                config=config
            )
        except ValidationError as e:
            logger.error(f"Template validation error: {e}")
            raise ValueError(f"Invalid template data: {e}")
        
        # Create WorkOrderMetadata
        try:
            metadata = WorkOrderMetadata(**metadata_data)
        except ValidationError as e:
            logger.error(f"Metadata validation error: {e}")
            raise ValueError(f"Invalid metadata data: {e}")
        
        # Create WorkOrder model instance
        try:
            workorder = WorkOrder(
                id=request.id,
                template=template,
                metadata=metadata
            )
        except ValidationError as e:
            logger.error(f"WorkOrder validation error: {e}")
            raise ValueError(f"Invalid workorder data: {e}")
        
        # Create workorder in repository
        commit = repo.create_workorder(
            workorder=workorder,
            commit_message=request.commit_message,
            author=request.author
        )
        
        # Get the created workorder
        created_workorder = repo.get_workorder(workorder.id)
        
        # Log success
        logger.info(f"Successfully created workorder with ID: {workorder.id}")
        
        return WorkOrderResponse(
            id=created_workorder.id,
            version=created_workorder.metadata.version,
            template=created_workorder.template.dict(),
            metadata=created_workorder.metadata.dict(),
            commit=commit,
            updated_at=created_workorder.metadata.updated_at
        )
    except ValueError as e:
        logger.error(f"Value error creating workorder: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log the full exception with stack trace
        logger.error(f"Error creating workorder: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to create workorder: {str(e)}")

# Add the missing GET endpoint
@router.get("", response_model=List[WorkOrderListResponse])
async def list_workorders(
    repo: WorkOrderRepository = Depends(get_workorder_repository)
):
    """List all workorders."""
    try:
        workorders = repo.list_workorders()
        return workorders
    except Exception as e:
        logger.error(f"Error listing workorders: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to list workorders: {str(e)}")

# Add update endpoint
@router.put("/{workorder_id}", response_model=WorkOrderResponse)
async def update_workorder(
    workorder_id: str = Path(..., description="The ID of the workorder to update"),
    request: WorkOrderUpdateRequest = Body(...),
    repo: WorkOrderRepository = Depends(get_workorder_repository)
):
    """Update an existing workorder."""
    try:
        # Log incoming request data for debugging
        logger.info(f"Updating workorder with ID: {workorder_id}")
        logger.info(f"Template data: {request.template}")
        logger.info(f"Metadata: {request.metadata}")
        
        # Get existing workorder
        existing_workorder = repo.get_workorder(workorder_id)
        
        # Process parameters if they exist in template data
        parameters = []
        if "parameters" in request.template:
            for param in request.template.get("parameters", []):
                try:
                    parameters.append(WorkOrderParameter(**param))
                except ValidationError as e:
                    logger.error(f"Parameter validation error: {e}")
                    raise ValueError(f"Invalid parameter data: {e}")
        
        # Create WorkOrderTemplate with proper structure
        try:
            # Extract config with default empty dict
            config_data = request.template.get("config", {}) or {}
            config = WorkOrderConfig(**config_data)
            
            template = WorkOrderTemplate(
                text=request.template.get("text", ""),
                parameters=parameters,
                config=config
            )
        except ValidationError as e:
            logger.error(f"Template validation error: {e}")
            raise ValueError(f"Invalid template data: {e}")
        
        # Create WorkOrderMetadata
        try:
            metadata = WorkOrderMetadata(**request.metadata)
        except ValidationError as e:
            logger.error(f"Metadata validation error: {e}")
            raise ValueError(f"Invalid metadata data: {e}")
        
        # Update workorder with new data
        try:
            updated_workorder = WorkOrder(
                id=workorder_id,
                template=template,
                metadata=metadata,
                parent_id=existing_workorder.parent_id,
                lineage=existing_workorder.lineage
            )
        except ValidationError as e:
            logger.error(f"WorkOrder validation error: {e}")
            raise ValueError(f"Invalid workorder data: {e}")
        
        # Update in repository
        commit = repo.update_workorder(
            workorder=updated_workorder,
            commit_message=request.commit_message,
            author=request.author
        )
        
        # Get the updated workorder
        result = repo.get_workorder(workorder_id)
        
        # Log success
        logger.info(f"Successfully updated workorder with ID: {workorder_id}")
        
        return WorkOrderResponse(
            id=result.id,
            version=result.metadata.version,
            template=result.template.dict(),
            metadata=result.metadata.dict(),
            commit=commit,
            updated_at=result.metadata.updated_at
        )
    except ValueError as e:
        logger.error(f"Value error updating workorder: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating workorder: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to update workorder: {str(e)}")

# Add other necessary endpoints (get, delete, history, etc.)
@router.delete("/{workorder_id}")
async def delete_workorder(
    workorder_id: str = Path(..., description="The ID of the workorder to delete"),
    commit_message: str = Query(..., description="Commit message"),
    author: str = Query(..., description="Author of the commit"),
    repo: WorkOrderRepository = Depends(get_workorder_repository)
):
    """Delete a workorder."""
    try:
        repo.delete_workorder(
            workorder_id=workorder_id,
            commit_message=commit_message,
            author=author
        )
        return {"message": f"WorkOrder {workorder_id} deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting workorder: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to delete workorder: {str(e)}")

@router.get("/{workorder_id}", response_model=WorkOrderResponse)
async def get_workorder(
    workorder_id: str = Path(..., description="The ID of the workorder to retrieve"),
    version: Optional[str] = Query(None, description="Optional version or commit reference"),
    repo: WorkOrderRepository = Depends(get_workorder_repository)
):
    """Get a workorder by ID and optional version."""
    try:
        workorder = repo.get_workorder(workorder_id, version)
        
        # Get commit info
        if version:
            commit = version
        else:
            # Get last commit for this workorder
            workorder_path = repo._get_workorder_path(workorder_id)
            last_commit = next(repo.repo.iter_commits(paths=str(workorder_path)))
            commit = last_commit.hexsha
        
        return WorkOrderResponse(
            id=workorder.id,
            version=workorder.metadata.version,
            template=workorder.template.dict(),
            metadata=workorder.metadata.dict(),
            commit=commit,
            updated_at=workorder.metadata.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting workorder: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get workorder: {str(e)}")

@router.get("/{workorder_id}/history", response_model=WorkOrderHistoryResponse)
async def get_workorder_history(
    workorder_id: str = Path(..., description="The ID of the workorder"),
    repo: WorkOrderRepository = Depends(get_workorder_repository)
):
    """Get the version history of a workorder."""
    try:
        versions = repo.get_workorder_history(workorder_id)
        
        # Format version history
        history = [
            {
                "version": v.version,
                "commit_hash": v.commit_hash,
                "created_at": v.created_at.isoformat(),
                "author": v.author,
                "message": v.message
            }
            for v in versions
        ]
        
        return WorkOrderHistoryResponse(
            workorder_id=workorder_id,
            versions=history
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting workorder history: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get workorder history: {str(e)}")