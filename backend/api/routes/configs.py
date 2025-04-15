"""
Generic API routes for configuration management.
These endpoints support all configuration types in a unified interface.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import traceback
from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body, BackgroundTasks
from pydantic import BaseModel, ValidationError

from backend.models.configuration import Configuration, ConfigurationMetadata
from backend.config.config_types import get_config_types, get_config_type, validate_config_type
from backend.services.config_repository import ConfigRepository, get_config_repository

# Create logger
logger = logging.getLogger(__name__)

# Create the router object
router = APIRouter(prefix="/api/v1/configs", tags=["configs"])

# Request/Response Models
class ConfigCreateRequest(BaseModel):
    id: str
    content: Dict[str, Any]
    metadata: Dict[str, Any]
    commit_message: str
    author: str

class ConfigUpdateRequest(BaseModel):
    content: Dict[str, Any]
    metadata: Dict[str, Any]
    commit_message: str
    author: str

class ConfigResponse(BaseModel):
    id: str
    config_type: str
    version: str
    content: Dict[str, Any]
    metadata: Dict[str, Any]
    commit: str
    updated_at: datetime

class ConfigListResponse(BaseModel):
    id: str
    config_type: str
    version: str
    title: str
    author: str
    updated_at: str
    last_commit: str
    archived: Optional[bool] = None # Make field optional to handle missing data gracefully
    last_commit_message: str

class ConfigHistoryResponse(BaseModel):
    config_id: str
    config_type: str
    versions: List[Dict[str, Any]]

# Get configuration types endpoint
@router.get("/types", response_model=List[Dict[str, Any]])
async def get_configuration_types():
    """Get all registered configuration types."""
    try:
        config_types = get_config_types()
        
        # Format for API response
        result = []
        for key, info in config_types.items():
            result.append({
                "type": key,
                "name": info.get("name", key),
                "description": info.get("description", ""),
                "supportsVersioning": info.get("supportsVersioning", True)
            })
            
        return result
    except Exception as e:
        logger.error(f"Error getting configuration types: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get configuration types: {str(e)}")

# List configurations endpoint
@router.get("/{config_type}", response_model=List[ConfigListResponse])
async def list_configs(
    config_type: str = Path(..., description="The type of configuration"),
    archived: Optional[bool] = Query(None, description="Filter by archived status")
):
    """List all configurations of a specific type."""
    try:
        # Validate config type
        try:
            validate_config_type(config_type)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Configuration type {config_type} not found")
        
        # Get repository for this type
        repo = get_config_repository(config_type)
        
        # List configurations
        configs = repo.list_configs()
        
        # Apply archived filter if specified
        if archived is not None:
            configs = [c for c in configs if c.get("archived", False) == archived]
            
        # Ensure the response model can handle the data structure from repo.list_configs
        # No explicit mapping needed if field names match ConfigListResponse
        # Pydantic will automatically use the fields defined in ConfigListResponse
        # including the newly added 'archived' field.
        return configs 
    except HTTPException:
        # Re-raise HTTPExceptions directly
        raise
    except Exception as e:
        logger.error(f"Error listing configurations: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to list configurations: {str(e)}")

# Get configuration endpoint
@router.get("/{config_type}/{config_id}", response_model=ConfigResponse)
async def get_config(
    config_type: str = Path(..., description="The type of configuration"),
    config_id: str = Path(..., description="The ID of the configuration to retrieve"),
    version: Optional[str] = Query(None, description="Optional version or commit reference")
):
    """Get a configuration by type, ID and optional version."""
    try:
        # Validate config type
        try:
            validate_config_type(config_type)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Configuration type {config_type} not found")
        
        # Get repository for this type
        repo = get_config_repository(config_type)
        
        # Get configuration
        config = repo.get_config(config_id, version)
        
        # Get commit info
        if version:
            commit = version
        else:
            # Get last commit for this config
            config_path = repo._get_config_path(config_id)
            # CORRECTED: Access iter_commits via the repo object within ConfigRepository
            last_commit = next(repo.repo.iter_commits(paths=str(config_path)))
            commit = last_commit.hexsha
        
        return ConfigResponse(
            id=config.id,
            config_type=config.config_type,
            version=config.metadata.version,
            content=config.content.dict() if hasattr(config.content, "dict") else config.content,
            metadata=config.metadata.dict(),
            commit=commit,
            updated_at=config.metadata.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting configuration: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")

# Create configuration endpoint
@router.post("/{config_type}", response_model=ConfigResponse)
async def create_config(
    config_type: str = Path(..., description="The type of configuration"),
    request: ConfigCreateRequest = Body(...)
):
    """Create a new configuration."""
    try:
        # Validate config type
        try:
            validate_config_type(config_type)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Configuration type {config_type} not found")
        
        # Get repository for this type
        repo = get_config_repository(config_type)
        
        # Create configuration object
        try:
            metadata = ConfigurationMetadata(**request.metadata)
            
            config = Configuration(
                id=request.id,
                config_type=config_type,
                content=request.content,
                metadata=metadata
            )
        except ValidationError as e:
            logger.error(f"Validation error: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid configuration data: {str(e)}")
        
        # Create in repository
        commit = repo.create_config(
            config=config,
            commit_message=request.commit_message,
            author=request.author
        )
        
        # Get created configuration
        created_config = repo.get_config(config.id)
        
        return ConfigResponse(
            id=created_config.id,
            config_type=created_config.config_type,
            version=created_config.metadata.version,
            content=created_config.content if isinstance(created_config.content, dict) else created_config.content.dict(),
            metadata=created_config.metadata.dict(),
            commit=commit,
            updated_at=created_config.metadata.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating configuration: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to create configuration: {str(e)}")

# Update configuration endpoint
@router.put("/{config_type}/{config_id}", response_model=ConfigResponse)
async def update_config(
    config_type: str = Path(..., description="The type of configuration"),
    config_id: str = Path(..., description="The ID of the configuration to update"),
    request: ConfigUpdateRequest = Body(...)
):
    """Update an existing configuration."""
    try:
        # Validate config type
        try:
            validate_config_type(config_type)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Configuration type {config_type} not found")
        
        # Get repository for this type
        repo = get_config_repository(config_type)
        
        # Get existing configuration
        existing_config = repo.get_config(config_id)
        
        # Update configuration
        try:
            metadata = ConfigurationMetadata(**request.metadata)
            
            updated_config = Configuration(
                id=config_id,
                config_type=config_type,
                content=request.content,
                metadata=metadata,
                parent_id=existing_config.parent_id,
                lineage=existing_config.lineage
            )
        except ValidationError as e:
            logger.error(f"Validation error: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid configuration data: {str(e)}")
        
        # Update in repository
        commit = repo.update_config(
            config=updated_config,
            commit_message=request.commit_message,
            author=request.author
        )
        
        # Get updated configuration
        result = repo.get_config(config_id)
        
        return ConfigResponse(
            id=result.id,
            config_type=result.config_type,
            version=result.metadata.version,
            content=result.content if isinstance(result.content, dict) else result.content.dict(),
            metadata=result.metadata.dict(),
            commit=commit,
            updated_at=result.metadata.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating configuration: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")

# Delete configuration endpoint
@router.delete("/{config_type}/{config_id}")
async def delete_config(
    config_type: str = Path(..., description="The type of configuration"),
    config_id: str = Path(..., description="The ID of the configuration to delete"),
    commit_message: str = Query(..., description="Commit message"),
    author: str = Query(..., description="Author of the commit")
):
    """Delete a configuration."""
    try:
        # Validate config type
        try:
            validate_config_type(config_type)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Configuration type {config_type} not found")
        
        # Get repository for this type
        repo = get_config_repository(config_type)
        
        # Delete from repository
        commit = repo.delete_config(
            config_id=config_id,
            commit_message=commit_message,
            author=author
        )
        
        return {"message": f"Configuration {config_id} deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting configuration: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to delete configuration: {str(e)}")

# Get configuration history endpoint
@router.get("/{config_type}/{config_id}/history", response_model=ConfigHistoryResponse)
async def get_config_history(
    config_type: str = Path(..., description="The type of configuration"),
    config_id: str = Path(..., description="The ID of the configuration")
):
    """Get the version history of a configuration."""
    try:
        # Validate config type
        try:
            validate_config_type(config_type)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Configuration type {config_type} not found")
        
        # Get repository for this type
        repo = get_config_repository(config_type)
        
        # Get history
        versions = repo.get_config_history(config_id)
        
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
        
        return ConfigHistoryResponse(
            config_id=config_id,
            config_type=config_type,
            versions=history
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting configuration history: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get configuration history: {str(e)}")

# Archive configuration endpoint
@router.post("/{config_type}/{config_id}/archive")
async def archive_config(
    config_type: str = Path(..., description="The type of configuration"),
    config_id: str = Path(..., description="The ID of the configuration to archive"),
    author: str = Query(..., description="Author of the action")
):
    """Archive a configuration."""
    try:
        # Validate config type
        try:
            validate_config_type(config_type)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Configuration type {config_type} not found")
        
        # Get repository for this type
        repo = get_config_repository(config_type)
        
        # Archive configuration
        repo.archive_config(config_id, author)
        
        return {"message": f"Configuration {config_id} archived successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error archiving configuration: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to archive configuration: {str(e)}")

# Unarchive configuration endpoint
@router.post("/{config_type}/{config_id}/unarchive")
async def unarchive_config(
    config_type: str = Path(..., description="The type of configuration"),
    config_id: str = Path(..., description="The ID of the configuration to unarchive"),
    author: str = Query(..., description="Author of the action")
):
    """Unarchive a configuration."""
    try:
        # Validate config type
        try:
            validate_config_type(config_type)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Configuration type {config_type} not found")
        
        # Get repository for this type
        repo = get_config_repository(config_type)
        
        # Unarchive configuration
        repo.unarchive_config(config_id, author)
        
        return {"message": f"Configuration {config_id} unarchived successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error unarchiving configuration: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to unarchive configuration: {str(e)}")

# Clone configuration endpoint
@router.post("/{config_type}/{config_id}/clone")
async def clone_config(
    config_type: str = Path(..., description="The type of configuration"),
    config_id: str = Path(..., description="The ID of the configuration to clone"),
    new_id: str = Query(..., description="ID for the cloned configuration"),
    author: str = Query(..., description="Author of the clone")
):
    """Clone a configuration to create a new one."""
    try:
        # Validate config type
        try:
            validate_config_type(config_type)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Configuration type {config_type} not found")
        
        # Get repository for this type
        repo = get_config_repository(config_type)
        
        # Clone configuration
        commit = repo.clone_config(config_id, new_id, author)
        
        # Get the created configuration
        cloned_config = repo.get_config(new_id)
        
        return ConfigResponse(
            id=cloned_config.id,
            config_type=cloned_config.config_type,
            version=cloned_config.metadata.version,
            content=cloned_config.content if isinstance(cloned_config.content, dict) else cloned_config.content.dict(),
            metadata=cloned_config.metadata.dict(),
            commit=commit,
            updated_at=cloned_config.metadata.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error cloning configuration: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to clone configuration: {str(e)}")