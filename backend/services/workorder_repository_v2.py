# backend/services/workorder_repository_v2.py
"""
Specialized repository for WorkOrder configurations.
Extends the base ConfigRepository with WorkOrder-specific functionality.
"""

import logging
from typing import Dict, List, Optional, Any, cast

from backend.models.workorder import WorkOrder, WorkOrderVersion
from backend.models.configuration import Configuration
from backend.services.config_repository import ConfigRepository

logger = logging.getLogger(__name__)

class WorkOrderRepository(ConfigRepository):
    """Repository for WorkOrder configurations."""
    
    def __init__(self, repo_path: Optional[str] = None):
        """Initialize repository for workorder configurations."""
        super().__init__("workorder", repo_path)
    
    def get_workorder(self, workorder_id: str, version: Optional[str] = None) -> WorkOrder:
        """
        Get a workorder by ID and optional version.
        This is a strongly-typed version of get_config.
        
        Args:
            workorder_id: Workorder ID
            version: Optional version or commit hash
            
        Returns:
            WorkOrder instance
        """
        config = super().get_config(workorder_id, version, WorkOrder)
        return cast(WorkOrder, config)
    
    def create_workorder(self, workorder: WorkOrder, commit_message: str, author: str) -> str:
        """
        Create a new workorder in the repository.
        This is a strongly-typed version of create_config.
        
        Args:
            workorder: The workorder to create
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        """
        return super().create_config(workorder, commit_message, author)
    
    def update_workorder(self, workorder: WorkOrder, commit_message: str, author: str) -> str:
        """
        Update an existing workorder.
        This is a strongly-typed version of update_config.
        
        Args:
            workorder: The updated workorder
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        """
        return super().update_config(workorder, commit_message, author)
    
    def delete_workorder(self, workorder_id: str, commit_message: str, author: str) -> str:
        """
        Delete a workorder.
        This is a strongly-typed version of delete_config.
        
        Args:
            workorder_id: ID of the workorder to delete
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        """
        return super().delete_config(workorder_id, commit_message, author)
    
    def list_workorders(self) -> List[Dict[str, Any]]:
        """
        List all workorders.
        This is a strongly-typed version of list_configs.
        
        Returns:
            List of workorder metadata
        """
        return super().list_configs()
    
    def get_workorder_history(self, workorder_id: str) -> List[WorkOrderVersion]:
        """
        Get the version history of a workorder.
        This is a strongly-typed version of get_config_history.
        
        Args:
            workorder_id: ID of the workorder
            
        Returns:
            List of workorder versions
        """
        versions = super().get_config_history(workorder_id, WorkOrder)
        return [WorkOrderVersion(
            workorder_id=v.config_id,
            version=v.version,
            commit_hash=v.commit_hash,
            created_at=v.created_at,
            author=v.author,
            message=v.message,
            workorder=cast(WorkOrder, v.configuration)
        ) for v in versions]
