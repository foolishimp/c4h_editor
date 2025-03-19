# File: backend/dependencies.py
"""
Dependency injection functions for FastAPI endpoints.
"""

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
    """Get or create a configuration repository instance."""
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
    """Get or create a workorder repository instance."""
    return get_config_repository_instance("workorder")

def get_teamconfig_repository():
    """Get or create a team config repository instance."""
    return get_config_repository_instance("teamconfig")

def get_runtimeconfig_repository():
    """Get or create a runtime config repository instance."""
    return get_config_repository_instance("runtimeconfig")

def get_lineage_tracker():
    """Get or create a lineage tracker instance."""
    global _lineage_tracker
    if _lineage_tracker is None:
        lineage_path = Path("./data/lineage")
        lineage_path.parent.mkdir(exist_ok=True)
        _lineage_tracker = LineageTracker(str(lineage_path))
    return _lineage_tracker

def get_llm_service():
    """Get or create an LLM service instance."""
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
    """Get or create a job repository instance."""
    global _job_repository
    if _job_repository is None:
        job_path = Path("./data/jobs")
        job_path.parent.mkdir(exist_ok=True)
        _job_repository = JobRepository(str(job_path))
    return _job_repository

def get_c4h_service():
    """Get or create a C4H service client instance."""
    global _c4h_service
    if _c4h_service is None:
        # Load from default config path if available
        config_path = Path("./config.yaml")
        if config_path.exists():
            _c4h_service = C4HService(str(config_path))
        else:
            _c4h_service = C4HService()
    return _c4h_service
