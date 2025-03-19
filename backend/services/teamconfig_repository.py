# backend/services/teamconfig_repository.py
"""
Specialized repository for TeamConfig configurations.
Extends the base ConfigRepository with TeamConfig-specific functionality.
"""

import logging
from typing import Dict, List, Optional, Any, cast

from backend.models.teamconfig import TeamConfig, TeamConfigVersion
from backend.models.configuration import Configuration
from backend.services.config_repository import ConfigRepository

logger = logging.getLogger(__name__)

class TeamConfigRepository(ConfigRepository):
    """Repository for TeamConfig configurations."""
    
    def __init__(self, repo_path: Optional[str] = None):
        """Initialize repository for team configurations."""
        super().__init__("teamconfig", repo_path)
    
    def get_teamconfig(self, teamconfig_id: str, version: Optional[str] = None) -> TeamConfig:
        """
        Get a team configuration by ID and optional version.
        This is a strongly-typed version of get_config.
        
        Args:
            teamconfig_id: TeamConfig ID
            version: Optional version or commit hash
            
        Returns:
            TeamConfig instance
        """
        config = super().get_config(teamconfig_id, version, TeamConfig)
        return cast(TeamConfig, config)
    
    def create_teamconfig(self, teamconfig: TeamConfig, commit_message: str, author: str) -> str:
        """
        Create a new team configuration in the repository.
        This is a strongly-typed version of create_config.
        
        Args:
            teamconfig: The team configuration to create
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        """
        return super().create_config(teamconfig, commit_message, author)
    
    def update_teamconfig(self, teamconfig: TeamConfig, commit_message: str, author: str) -> str:
        """
        Update an existing team configuration.
        This is a strongly-typed version of update_config.
        
        Args:
            teamconfig: The updated team configuration
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        """
        return super().update_config(teamconfig, commit_message, author)
    
    def delete_teamconfig(self, teamconfig_id: str, commit_message: str, author: str) -> str:
        """
        Delete a team configuration.
        This is a strongly-typed version of delete_config.
        
        Args:
            teamconfig_id: ID of the team configuration to delete
            commit_message: Commit message
            author: Author of the commit
            
        Returns:
            Commit hash
        """
        return super().delete_config(teamconfig_id, commit_message, author)
    
    def list_teamconfigs(self) -> List[Dict[str, Any]]:
        """
        List all team configurations.
        This is a strongly-typed version of list_configs.
        
        Returns:
            List of team configuration metadata
        """
        return super().list_configs()
    
    def get_teamconfig_history(self, teamconfig_id: str) -> List[TeamConfigVersion]:
        """
        Get the version history of a team configuration.
        This is a strongly-typed version of get_config_history.
        
        Args:
            teamconfig_id: ID of the team configuration
            
        Returns:
            List of team configuration versions
        """
        versions = super().get_config_history(teamconfig_id, TeamConfig)
        return [TeamConfigVersion(
            config_id=v.config_id,
            config_type=v.config_type,
            version=v.version,
            commit_hash=v.commit_hash,
            created_at=v.created_at,
            author=v.author,
            message=v.message,
            configuration=cast(TeamConfig, v.configuration)
        ) for v in versions]
