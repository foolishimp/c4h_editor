#!/usr/bin/env python
# File: remove_lineage_tracker.py
"""
Script to remove the lineage tracker from the C4H Editor backend.
"""

import os
import shutil
from pathlib import Path
from datetime import datetime
import stat

# Files to update
FILES_TO_UPDATE = {
    "backend/main.py": "main.py",
    "backend/dependencies.py": "dependencies.py",
    "backend/api/routes/configs.py": "configs.py"
}

# File to remove
LINEAGE_TRACKER_FILE = "backend/services/lineage_tracker.py"

def remove_readonly(func, path, _):
    """Clear the readonly bit and reattempt removal."""
    os.chmod(path, stat.S_IWRITE)
    func(path)

def main():
    """Main function to remove the lineage tracker."""
    # Create backup directory
    backup_dir = Path(f"lineage_backup_{datetime.now().strftime('%Y%m%d%H%M%S')}")
    backup_dir.mkdir(exist_ok=True)
    
    print(f"Backing up files to {backup_dir}")
    
    # Backup and remove lineage tracker file
    lineage_path = Path(LINEAGE_TRACKER_FILE)
    if lineage_path.exists():
        # Create parent directories in backup
        backup_path = backup_dir / lineage_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Backup file
        shutil.copy2(lineage_path, backup_path)
        print(f"Backed up: {lineage_path}")
        
        # Remove file
        if os.name == 'nt' and not os.access(lineage_path, os.W_OK):
            # Handle read-only files on Windows
            os.chmod(lineage_path, stat.S_IWRITE)
        lineage_path.unlink()
        print(f"Removed: {lineage_path}")
    else:
        print(f"Lineage tracker file not found: {lineage_path}")
    
    # Update files to remove lineage tracker dependencies
    for file_path, name in FILES_TO_UPDATE.items():
        path = Path(file_path)
        if path.exists():
            # Backup file
            backup_path = backup_dir / path
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, backup_path)
            print(f"Backed up: {path}")
            
            # Check which file we're updating and use the appropriate content
            if name == "main.py":
                with open("backend/main.py", "w") as f:
                    f.write(MAIN_PY_CONTENT)
                print(f"Updated: {path}")
            elif name == "dependencies.py":
                with open("backend/dependencies.py", "w") as f:
                    f.write(DEPENDENCIES_PY_CONTENT)
                print(f"Updated: {path}")
            elif name == "configs.py":
                with open("backend/api/routes/configs.py", "w") as f:
                    f.write(CONFIGS_PY_CONTENT)
                print(f"Updated: {path}")
        else:
            print(f"File not found: {path}")
    
    # Search for other lineage tracker references
    print("\nChecking for other lineage tracker references...")
    backend_dir = Path("backend")
    if backend_dir.exists():
        for path in backend_dir.glob("**/*.py"):
            # Skip files we've already updated
            if path in [Path(p) for p in FILES_TO_UPDATE.keys()]:
                continue
                
            # Check for lineage references
            with open(path, "r") as f:
                content = f.read()
                
            if "lineage_tracker" in content.lower() or "get_lineage_tracker" in content:
                print(f"Found lineage tracker reference in: {path}")
                print("  You may need to manually update this file to remove lineage tracker references.")
    
    print("\nLineage tracker removal complete!")
    print(f"Backups stored in: {backup_dir}")
    print("\nNext steps:")
    print("1. Check for any manually reported files that may still contain lineage tracker references")
    print("2. Run the server with: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000")

# File content for main.py
MAIN_PY_CONTENT = """# File: backend/main.py
\"\"\"
Main application entry point for the C4H Backend.
Sets up FastAPI, routes, and middleware.
Focused on configuration management and C4H service access.
\"\"\"

import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from contextlib import asynccontextmanager

# Import only the routes we need - removing legacy routes
from backend.api.routes.configs import router as configs_router
from backend.api.routes.jobs import router as jobs_router
from backend.services.config_repository import ConfigRepository
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService
from backend.config import load_config
from backend.config.config_types import load_config_types, get_config_types
from backend.dependencies import get_job_repository, get_c4h_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load configuration
config_path = os.environ.get("CONFIG_PATH", "./config.yaml")
config = load_config(config_path)

# Load configuration types
config_types = load_config_types()

# Lifespan context manager for setup and cleanup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize services
    logger.info("Application starting up")
    
    # Initialize repos for all registered config types
    for config_type in config_types.keys():
        repo_path = config_types[config_type].get("repository", {}).get("path")
        if repo_path:
            path = Path(repo_path)
            path.parent.mkdir(exist_ok=True)
            ConfigRepository(config_type, str(path))
            logger.info(f"Initialized repository for {config_type}")
    
    # Make sure other dependencies are initialized
    get_job_repository()
    
    c4h_service = get_c4h_service()
    
    yield
    
    # Shutdown: clean up resources
    logger.info("Application shutting down")
    
    # Close C4H service client
    await c4h_service.close()

# Create FastAPI app with lifespan
app = FastAPI(
    title="C4H Editor API",
    description="API for managing configurations with version control",
    version="0.2.0",
    lifespan=lifespan
)

# Add CORS middleware with configuration from config
origins = config.get("api", {}).get("cors_origins", ["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - only using the new generic ones
app.include_router(configs_router)
app.include_router(jobs_router)

# Add health check endpoint
@app.get("/health")
async def health_check():
    \"\"\"Health check endpoint for the API.\"\"\"
    # Get all available config types
    available_config_types = list(get_config_types().keys())
    
    return {
        "status": "healthy",
        "version": "0.2.0",
        "config_loaded": bool(config),
        "services": {
            "repository": True,
            "jobs": True,
            "c4h": True
        },
        "supported_config_types": available_config_types
    }

@app.get("/api/v1/config-types")
async def get_config_types_endpoint():
    \"\"\"Get all registered configuration types.\"\"\"
    config_types_info = get_config_types()
    
    # Format for API response
    result = []
    for key, info in config_types_info.items():
        result.append({
            "type": key,
            "name": info.get("name", key),
            "description": info.get("description", ""),
            "supportsVersioning": info.get("supportsVersioning", True)
        })
        
    return result

if __name__ == "__main__":
    import uvicorn
    
    # Get host and port from environment or config
    host = os.environ.get("HOST", config.get("api", {}).get("host", "0.0.0.0"))
    port = int(os.environ.get("PORT", config.get("api", {}).get("port", 8000)))
    
    # Start server
    uvicorn.run(app, host=host, port=port)
"""

# File content for dependencies.py
DEPENDENCIES_PY_CONTENT = """# File: backend/dependencies.py
\"\"\"
Dependency injection functions for FastAPI endpoints.
Focused on configuration management and C4H service access.
\"\"\"

from fastapi import Depends
from pathlib import Path
from typing import Dict, Optional
import logging

# Import services - remove lineage tracker
from backend.services.config_repository import ConfigRepository
from backend.services.workorder_repository_v2 import WorkOrderRepository
from backend.services.teamconfig_repository import TeamConfigRepository
from backend.services.runtimeconfig_repository import RuntimeConfigRepository
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService
from backend.config.config_types import get_config_types

# Configure logger
logger = logging.getLogger(__name__)

# Singleton instances
_repositories = {}
_job_repository = None
_c4h_service = None

def get_config_repository(config_type: str) -> ConfigRepository:
    \"\"\"Get or create a configuration repository instance.\"\"\"
    global _repositories
    
    if config_type not in _repositories:
        repo_path = get_config_types().get(config_type, {}).get("repository", {}).get("path")
        if repo_path:
            path = Path(repo_path)
            path.parent.mkdir(exist_ok=True)
            
            if config_type == "workorder":
                _repositories[config_type] = WorkOrderRepository(str(path))
                logger.info(f"Created WorkOrderRepository at {path}")
            elif config_type == "teamconfig":
                _repositories[config_type] = TeamConfigRepository(str(path))
                logger.info(f"Created TeamConfigRepository at {path}")
            elif config_type == "runtimeconfig":
                _repositories[config_type] = RuntimeConfigRepository(str(path))
                logger.info(f"Created RuntimeConfigRepository at {path}")
            else:
                _repositories[config_type] = ConfigRepository(config_type, str(path))
                logger.info(f"Created generic ConfigRepository for {config_type} at {path}")
        else:
            _repositories[config_type] = ConfigRepository(config_type)
            logger.info(f"Created generic ConfigRepository for {config_type} with default path")
            
    return _repositories[config_type]

def get_workorder_repository():
    \"\"\"Get or create a workorder repository instance.\"\"\"
    return get_config_repository("workorder")

def get_teamconfig_repository():
    \"\"\"Get or create a team config repository instance.\"\"\"
    return get_config_repository("teamconfig")

def get_runtimeconfig_repository():
    \"\"\"Get or create a runtime config repository instance.\"\"\"
    return get_config_repository("runtimeconfig")

def get_job_repository():
    \"\"\"Get or create a job repository instance.\"\"\"
    global _job_repository
    if _job_repository is None:
        job_path = Path("./data/jobs")
        job_path.parent.mkdir(exist_ok=True)
        _job_repository = JobRepository(str(job_path))
        logger.info(f"Created JobRepository at {job_path}")
    return _job_repository

def get_c4h_service():
    \"\"\"Get or create a C4H service client instance.\"\"\"
    global _c4h_service
    if _c4h_service is None:
        # Load from default config path if available
        config_path = Path("./config.yaml")
        if config_path.exists():
            _c4h_service = C4HService(str(config_path))
            logger.info(f"Created C4HService with config from {config_path}")
        else:
            _c4h_service = C4HService()
            logger.info("Created C4HService with default config")
    return _c4h_service
"""

# File content for configs.py
CONFIGS_PY_CONTENT = """# File: backend/api/routes/configs.py
\"\"\"
Generic API routes for configuration management.
These endpoints support all configuration types in a unified interface.
\"\"\"

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
    last_commit_message: str

class ConfigHistoryResponse(BaseModel):
    config_id: str
    config_type: str
    versions: List[Dict[str, Any]]

# Get configuration types endpoint
@router.get("/types", response_model=List[Dict[str, Any]])
async def get_configuration_types():
    \"\"\"Get all registered configuration types.\"\"\"
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
    \"\"\"List all configurations of a specific type.\"\"\"
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
            
        return configs
    except HTTPException:
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
    \"\"\"Get a configuration by type, ID and optional version.\"\"\"
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
    \"\"\"Create a new configuration.\"\"\"
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
    \"\"\"Update an existing configuration.\"\"\"
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
    \"\"\"Delete a configuration.\"\"\"
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
    \"\"\"Get the version history of a configuration.\"\"\"
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
    \"\"\"Archive a configuration.\"\"\"
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
    \"\"\"Unarchive a configuration.\"\"\"
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
    \"\"\"Clone a configuration to create a new one.\"\"\"
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
"""

if __name__ == "__main__":
    # Ask for confirmation
    print("This script will remove the lineage tracker from the C4H Editor backend.")
    print("The following files will be modified:")
    for file in FILES_TO_UPDATE.keys():
        print(f"  - {file}")
    print(f"The following file will be removed: {LINEAGE_TRACKER_FILE}")
    
    confirm = input("\nAre you sure you want to proceed? (y/n): ")
    if confirm.lower() == 'y':
        main()
    else:
        print("Operation cancelled.")