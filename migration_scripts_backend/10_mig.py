#!/usr/bin/env python
# Script to update main application and dependencies

import os
import sys
from pathlib import Path

# Ensure backend directory exists
backend_dir = Path("backend")
if not backend_dir.exists():
    print("Error: backend directory not found")
    sys.exit(1)

# Update dependencies.py
dependencies_path = backend_dir / "dependencies.py"
if dependencies_path.exists():
    # Create updated dependencies.py with support for configuration repositories
    with open(dependencies_path, "w") as f:
        f.write("""# File: backend/dependencies.py
\"\"\"
Dependency injection functions for FastAPI endpoints.
\"\"\"

from fastapi import Depends
from pathlib import Path
from typing import Dict, Optional

# Import services
from backend.services.config_repository import ConfigRepository, get_config_repository
from backend.services.workorder_repository_v2 import WorkOrderRepository
from backend.services.teamconfig_repository import TeamConfigRepository
from backend.services.runtimeconfig_repository import RuntimeConfigRepository
from backend.services.lineage_tracker import LineageTracker
from backend.services.llm_service import LLMService
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService
from backend.config.config_types import get_config_types

# Singleton instances
_repositories = {}
_lineage_tracker = None
_llm_service = None
_job_repository = None
_c4h_service = None

def get_config_repository_instance(config_type: str) -> ConfigRepository:
    \"\"\"Get or create a configuration repository instance.\"\"\"
    global _repositories
    
    if config_type not in _repositories:
        repo_path = get_config_types().get(config_type, {}).get("repository", {}).get("path")
        if repo_path:
            path = Path(repo_path)
            path.parent.mkdir(exist_ok=True)
            
            if config_type == "workorder":
                _repositories[config_type] = WorkOrderRepository(str(path))
            elif config_type == "teamconfig":
                _repositories[config_type] = TeamConfigRepository(str(path))
            elif config_type == "runtimeconfig":
                _repositories[config_type] = RuntimeConfigRepository(str(path))
            else:
                _repositories[config_type] = ConfigRepository(config_type, str(path))
        else:
            _repositories[config_type] = ConfigRepository(config_type)
            
    return _repositories[config_type]

def get_workorder_repository():
    \"\"\"Get or create a workorder repository instance.\"\"\"
    return get_config_repository_instance("workorder")

def get_teamconfig_repository():
    \"\"\"Get or create a team config repository instance.\"\"\"
    return get_config_repository_instance("teamconfig")

def get_runtimeconfig_repository():
    \"\"\"Get or create a runtime config repository instance.\"\"\"
    return get_config_repository_instance("runtimeconfig")

def get_lineage_tracker():
    \"\"\"Get or create a lineage tracker instance.\"\"\"
    global _lineage_tracker
    if _lineage_tracker is None:
        lineage_path = Path("./data/lineage")
        lineage_path.parent.mkdir(exist_ok=True)
        _lineage_tracker = LineageTracker(str(lineage_path))
    return _lineage_tracker

def get_llm_service():
    \"\"\"Get or create an LLM service instance.\"\"\"
    global _llm_service
    if _llm_service is None:
        # Load from default config path if available
        config_path = Path("./config.yaml")
        if config_path.exists():
            _llm_service = LLMService(str(config_path))
        else:
            _llm_service = LLMService()
    return _llm_service

def get_job_repository():
    \"\"\"Get or create a job repository instance.\"\"\"
    global _job_repository
    if _job_repository is None:
        job_path = Path("./data/jobs")
        job_path.parent.mkdir(exist_ok=True)
        _job_repository = JobRepository(str(job_path))
    return _job_repository

def get_c4h_service():
    \"\"\"Get or create a C4H service client instance.\"\"\"
    global _c4h_service
    if _c4h_service is None:
        # Load from default config path if available
        config_path = Path("./config.yaml")
        if config_path.exists():
            _c4h_service = C4HService(str(config_path))
        else:
            _c4h_service = C4HService()
    return _c4h_service
""")

    print(f"Updated {dependencies_path}")

# Update main.py
main_path = backend_dir / "main.py"
if main_path.exists():
    # Create updated main.py with support for configuration routes
    with open(main_path, "w") as f:
        f.write("""\"\"\"
Main application entry point for the C4H Backend.
Sets up FastAPI, routes, and middleware.
\"\"\"

import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from contextlib import asynccontextmanager

from backend.api.routes.workorders import router as workorders_router
from backend.api.routes.jobs import router as jobs_router
from backend.api.routes.configs import router as configs_router
from backend.services.config_repository import ConfigRepository
from backend.services.lineage_tracker import LineageTracker
from backend.services.llm_service import LLMService
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService
from backend.config import load_config
from backend.config.config_types import load_config_types, get_config_types
from backend.dependencies import get_lineage_tracker, get_llm_service, get_job_repository, get_c4h_service

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
    get_lineage_tracker()
    get_job_repository()
    
    llm_service = get_llm_service()
    c4h_service = get_c4h_service()
    
    yield
    
    # Shutdown: clean up resources
    logger.info("Application shutting down")
    
    # Close LLM service client
    await llm_service.close()
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

# Include routers
app.include_router(configs_router)  # New generic configs router
app.include_router(workorders_router)  # Legacy workorders router (for backward compatibility)
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
            "lineage": True,
            "llm": True,
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
""")

    print(f"Updated {main_path}")

print("Main Application and Dependencies updated successfully.")