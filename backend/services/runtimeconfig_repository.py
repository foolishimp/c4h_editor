# backend/services/runtimeconfig_repository.py
"""
Specialized repository for RuntimeConfig configurations.
Extends the base ConfigRepository with RuntimeConfig-specific functionality.
"""

import logging
from typing import Dict, List, Optional, Any, cast

from backend.models.runtimeconfig import RuntimeConfig, RuntimeConfigVersion
from backend.models.configuration import Configuration
from backend.services.config_repository import ConfigRepository

logger = logging.getLogger(__name__)

class RuntimeConfigRepository(ConfigRepository):
    """Repository for RuntimeConfig configurations."""
    
    def __init__(self, repo_path: Optional[str] = None):
        """Initialize repository for runtime configurations."""
        super().__init__("runtimeconfig", repo_path)
    
    def get_runtimeconfig(self, runtimeconfig_id: str, version: Optional[str] = None) -> RuntimeConfig:
        """
        Get a runtime configuration by ID and optional version.
        This is a strongly-typed version of get_config.
        
        Args:
            runtimeconfig_id: RuntimeConfig ID
            version: Optional version or commit hash
            
        Returns:
            RuntimeConfig instance
        """
        config = super().get_config(runtimeconfig_id, version, RuntimeConfig)
        return cast(RuntimeConfig, config)
    
    def create_runtimeconfig(self, runtimeconfig: RuntimeConfig, commit_message: str, author: str) -> str:
        """
        Create a new runtime configuration in the repository.
        This is a strongly-typed version of create_config.
        
        Args:
            runtimeconfig: The runtime configuration to create
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        """
        return super().create_config(runtimeconfig, commit_message, author)
    
    def update_runtimeconfig(self, runtimeconfig: RuntimeConfig, commit_message: str, author: str) -> str:
        """
        Update an existing runtime configuration.
        This is a strongly-typed version of update_config.
        
        Args:
            runtimeconfig: The updated runtime configuration
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        """
        return super().update_config(runtimeconfig, commit_message, author)
    
    def delete_runtimeconfig(self, runtimeconfig_id: str, commit_message: str, author: str) -> str:
        """
        Delete a runtime configuration.
        This is a strongly-typed version of delete_config.
        
        Args:
            runtimeconfig_id: ID of the runtime configuration to delete
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        """
        return super().delete_config(runtimeconfig_id, commit_message, author)
    
    def list_runtimeconfigs(self) -> List[Dict[str, Any]]:
        """
        List all runtime configurations.
        This is a strongly-typed version of list_configs.
        
        Returns:
            List of runtime configuration metadata
        """
        return super().list_configs()
    
    def get_runtimeconfig_history(self, runtimeconfig_id: str) -> List[RuntimeConfigVersion]:
        """
        Get the version history of a runtime configuration.
        This is a strongly-typed version of get_config_history.
        
        Args:
            runtimeconfig_id: ID of the runtime configuration
            
        Returns:
            List of runtime configuration versions
        """
        versions = super().get_config_history(runtimeconfig_id, RuntimeConfig)
        return [RuntimeConfigVersion(
            config_id=v.config_id,
            config_type=v.config_type,
            version=v.version,
            commit_hash=v.commit_hash,
            created_at=v.created_at,
            author=v.author,
            message=v.message,
            configuration=cast(RuntimeConfig, v.configuration)
        ) for v in versions]
