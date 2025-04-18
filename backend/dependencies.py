"""
Dependency injection functions for FastAPI endpoints.
Focused on generic configuration management and C4H service access.
"""

from fastapi import Depends
from pathlib import Path
import logging

from backend.services.config_repository import ConfigRepository
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
    """Get or create a configuration repository instance."""
    global _repositories
    
    if config_type not in _repositories:
        repo_path = get_config_types().get(config_type, {}).get("repository", {}).get("path")
        if repo_path:
            path = Path(repo_path)
            path.parent.mkdir(exist_ok=True)
            _repositories[config_type] = ConfigRepository(config_type, str(path))
            logger.info(f"Created ConfigRepository for {config_type} at {path}")
        else:
            _repositories[config_type] = ConfigRepository(config_type)
            logger.info(f"Created ConfigRepository for {config_type} with default path")
            
    return _repositories[config_type]

def get_job_repository():
    """Get or create a job repository instance."""
    global _job_repository
    if _job_repository is None:
        job_path = Path("./data/jobs")
        job_path.parent.mkdir(exist_ok=True)
        _job_repository = JobRepository(str(job_path))
        logger.info(f"Created JobRepository at {job_path}")
    return _job_repository

def get_c4h_service():
    """Get or create a C4H service client instance."""
    global _c4h_service
    if _c4h_service is None:
        # Load from default config path if available
        config_path = Path("./config.yaml")
        logger.info("Initializing C4H service with multi-config support")
        if config_path.exists():
            _c4h_service = C4HService(str(config_path))
            logger.info(f"Created C4HService with config from {config_path}")
        else:
            _c4h_service = C4HService()
            logger.info("Created C4HService with default config")
    return _c4h_service