# File: backend/dependencies.py
"""
Dependency injection functions for FastAPI endpoints.
"""

from fastapi import Depends
from pathlib import Path

# Import the new WorkOrderRepository
from backend.services.workorder_repository import WorkOrderRepository
from backend.services.lineage_tracker import LineageTracker
from backend.services.llm_service import LLMService
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService

# Singleton instances
_workorder_repository = None
_lineage_tracker = None
_llm_service = None
_job_repository = None
_c4h_service = None

def get_workorder_repository():
    """Get or create a workorder repository instance."""
    global _workorder_repository
    if _workorder_repository is None:
        repo_path = Path("./data/workorder_repository")
        repo_path.parent.mkdir(exist_ok=True)
        _workorder_repository = WorkOrderRepository(str(repo_path))
    return _workorder_repository

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