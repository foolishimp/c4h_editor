#!/usr/bin/env python
# File: complete_cleanup.py
"""
Comprehensive script to clean up legacy code in the C4H Editor backend
and create a focused configuration management system.
"""

import os
import shutil
from pathlib import Path
from datetime import datetime
import stat

# Files to remove
LEGACY_FILES = [
    "backend/services/prompt_repository.py",
    "backend/api/routes/prompts.py",
    "backend/models/prompt.py",
    "backend/services/workorder_repository.py",
    "backend/tests/test_prompt_repository.py",
    "backend/tests/test_workorder_repository.py",
    "backend/scripts/migrate_workorders.py",
    "backend/config.py",  # Old config file, now replaced by the config package
    "backend/services/llm_service.py",  # Removing LLM service for focused design
]

# New content for backend/config/__init__.py
CONFIG_INIT_CONTENT = """# File: backend/config/__init__.py
\"\"\"
Configuration management for the prompt editor backend.
Follows the Config Design Principles with hierarchical structure.
\"\"\"

import os
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any
from backend.config.config_types import load_config_types


# Default configuration
DEFAULT_CONFIG = {
    "app": {
        "name": "prompt-editor",
        "environment": "development",
    },
    "repository": {
        "path": "./data/prompt_repository",
        "backup_path": "./data/backups",
    },
    "lineage": {
        "enabled": True,
        "backend": "file",
        "file_path": "./data/lineage",
    },
    "api": {
        "cors_origins": ["*"],
    },
    "c4h_service": {
        "api_base": "https://api.c4h.example.com",
        "api_version": "v1",
        "api_key_env": "C4H_API_KEY",
        "default_config": {
            "max_runtime": 3600,
            "notify_on_completion": True
        }
    }
}


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    \"\"\"
    Load configuration from file and merge with defaults.
    
    Args:
        config_path: Path to YAML configuration file
        
    Returns:
        Merged configuration dictionary
    \"\"\"
    config = DEFAULT_CONFIG.copy()
    
    if config_path and os.path.exists(config_path):
        with open(config_path, "r") as f:
            file_config = yaml.safe_load(f)
            if file_config:
                # Merge with defaults using deep update
                config = deep_update(config, file_config)
    
    # Apply environment variables override
    env_config = {}
    for key, value in os.environ.items():
        if key.startswith("PROMPT_EDITOR_"):
            path = key[14:].lower().split("_")
            current = env_config
            for p in path[:-1]:
                if p not in current:
                    current[p] = {}
                current = current[p]
            current[path[-1]] = value
    
    # Merge environment overrides
    if env_config:
        config = deep_update(config, env_config)
    
    return config


def deep_update(base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    \"\"\"
    Deep update a nested dictionary.
    
    Args:
        base: Base dictionary to update
        update: Dictionary with updates
        
    Returns:
        Updated dictionary
    \"\"\"
    result = base.copy()
    
    for key, value in update.items():
        if isinstance(value, dict) and key in result and isinstance(result[key], dict):
            result[key] = deep_update(result[key], value)
        else:
            result[key] = value
    
    return result


def get_by_path(config: Dict[str, Any], path: list) -> Any:
    \"\"\"
    Get a value from a nested dictionary by path.
    
    Args:
        config: Configuration dictionary
        path: List of keys forming a path
        
    Returns:
        Value at path or None if not found
    \"\"\"
    result = config
    for key in path:
        if isinstance(result, dict) and key in result:
            result = result[key]
        else:
            return None
    return result
"""

# New content for main.py
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
from backend.services.lineage_tracker import LineageTracker
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService
from backend.config import load_config
from backend.config.config_types import load_config_types, get_config_types
from backend.dependencies import get_lineage_tracker, get_job_repository, get_c4h_service

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
            "lineage": True,
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

# New content for dependencies.py
DEPENDENCIES_PY_CONTENT = """# File: backend/dependencies.py
\"\"\"
Dependency injection functions for FastAPI endpoints.
Focused on configuration management and C4H service access.
\"\"\"

from fastapi import Depends
from pathlib import Path
from typing import Dict, Optional
import logging

# Import services - remove LLM service
from backend.services.config_repository import ConfigRepository
from backend.services.workorder_repository_v2 import WorkOrderRepository
from backend.services.teamconfig_repository import TeamConfigRepository
from backend.services.runtimeconfig_repository import RuntimeConfigRepository
from backend.services.lineage_tracker import LineageTracker
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService
from backend.config.config_types import get_config_types

# Configure logger
logger = logging.getLogger(__name__)

# Singleton instances
_repositories = {}
_lineage_tracker = None
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

def get_lineage_tracker():
    \"\"\"Get or create a lineage tracker instance.\"\"\"
    global _lineage_tracker
    if _lineage_tracker is None:
        lineage_path = Path("./data/lineage")
        lineage_path.parent.mkdir(exist_ok=True)
        _lineage_tracker = LineageTracker(str(lineage_path))
        logger.info(f"Created LineageTracker at {lineage_path}")
    return _lineage_tracker

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

def remove_readonly(func, path, _):
    """Clear the readonly bit and reattempt removal."""
    os.chmod(path, stat.S_IWRITE)
    func(path)

def update_api_configs_file():
    """Update configs.py file to remove LLM service dependencies."""
    configs_py_path = Path("backend/api/routes/configs.py")
    if configs_py_path.exists():
        with open(configs_py_path, "r") as f:
            content = f.read()
        
        # Remove LLM service imports and references
        content = content.replace(
            "from backend.services.llm_service import LLMService\n", 
            ""
        )
        content = content.replace(
            "from backend.dependencies import get_lineage_tracker, get_llm_service\n", 
            "from backend.dependencies import get_lineage_tracker\n"
        )
        
        with open(configs_py_path, "w") as f:
            f.write(content)
        
        print(f"Updated: {configs_py_path} (removed LLM service references)")
    else:
        print(f"Warning: {configs_py_path} not found")

def update_api_jobs_file():
    """Update jobs.py file to remove any LLM service dependencies."""
    jobs_py_path = Path("backend/api/routes/jobs.py")
    if jobs_py_path.exists():
        with open(jobs_py_path, "r") as f:
            content = f.read()
        
        # Remove LLM service imports and references if they exist
        content = content.replace(
            "from backend.services.llm_service import LLMService\n", 
            ""
        )
        content = content.replace(
            "llm_service: LLMService = Depends(get_llm_service)", 
            ""
        )
        
        with open(jobs_py_path, "w") as f:
            f.write(content)
        
        print(f"Updated: {jobs_py_path} (removed any LLM service references)")
    else:
        print(f"Warning: {jobs_py_path} not found")

def main():
    """Main function to clean up legacy code and implement a focused configuration system."""
    # Create backup directory
    backup_dir = Path(f"legacy_backup_{datetime.now().strftime('%Y%m%d%H%M%S')}")
    backup_dir.mkdir(exist_ok=True)
    
    print(f"Backing up legacy files to {backup_dir}")
    
    # Process each file
    for file_path in LEGACY_FILES:
        path = Path(file_path)
        
        if path.exists():
            # Create parent directories in backup
            backup_path = backup_dir / path
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Backup file
            shutil.copy2(path, backup_path)
            print(f"Backed up: {path}")
            
            # Remove file
            if os.name == 'nt' and not os.access(path, os.W_OK):
                # Handle read-only files on Windows
                os.chmod(path, stat.S_IWRITE)
            path.unlink()
            print(f"Removed: {path}")
        else:
            print(f"File not found (already removed): {path}")
    
    # Update config/__init__.py
    config_init_path = Path("backend/config/__init__.py")
    config_init_path.parent.mkdir(exist_ok=True)
    
    with open(config_init_path, "w") as f:
        f.write(CONFIG_INIT_CONTENT)
    
    print(f"Updated: {config_init_path}")
    
    # Update main.py
    main_py_path = Path("backend/main.py")
    main_py_path.parent.mkdir(exist_ok=True)
    
    with open(main_py_path, "w") as f:
        f.write(MAIN_PY_CONTENT)
    
    print(f"Updated: {main_py_path}")
    
    # Update dependencies.py
    dependencies_py_path = Path("backend/dependencies.py")
    dependencies_py_path.parent.mkdir(exist_ok=True)
    
    with open(dependencies_py_path, "w") as f:
        f.write(DEPENDENCIES_PY_CONTENT)
    
    print(f"Updated: {dependencies_py_path}")
    
    # Update api/routes/configs.py to remove LLM service dependencies
    update_api_configs_file()
    
    # Update api/routes/jobs.py to remove any LLM service dependencies
    update_api_jobs_file()
    
    print("\nFocused configuration system cleanup complete!")
    print(f"Backups stored in: {backup_dir}")
    print("\nNext steps:")
    print("1. Update your environment settings")
    print("2. Run the server with: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000")

if __name__ == "__main__":
    # Ask for confirmation
    print("This script will remove legacy code (including the LLM service) and implement a focused configuration system.")
    print("The following files will be removed:")
    for file in LEGACY_FILES:
        print(f"  - {file}")
    
    confirm = input("\nAre you sure you want to proceed? (y/n): ")
    if confirm.lower() == 'y':
        main()
    else:
        print("Operation cancelled.")