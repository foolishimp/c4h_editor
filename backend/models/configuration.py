# backend/models/configuration.py
"""
Base model for configurations in the C4H Editor.
Provides common structure and functionality for all configuration types.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

class ConfigurationMetadata(BaseModel):
    """Common metadata for all configuration types."""
    author: str = Field(..., description="Author of the configuration")
    archived: bool = Field(False, description="Whether the configuration is archived")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = Field(None, description="Description of the configuration")
    tags: List[str] = Field(default_factory=list, description="Tags for categorizing configurations")
    version: str = Field("1.0.0", description="Semantic version of the configuration")

class Configuration(BaseModel):
    """Base model for all configuration types."""
    id: str = Field(..., description="Unique identifier for the configuration")
    config_type: str = Field(..., description="Type of configuration (workorder, teamconfig, etc.)")
    content: Dict[str, Any] = Field(..., description="Configuration content specific to the type")
    metadata: ConfigurationMetadata = Field(..., description="Configuration metadata")
    parent_id: Optional[str] = Field(None, description="ID of the parent configuration if this is derived")
    lineage: List[str] = Field(default_factory=list, description="Lineage chain of configuration IDs")

    def validate_content(self) -> bool:
        """
        Validate configuration content against schema.
        This should be overridden by specific configuration types.
        
        Returns:
            True if valid, raises ValueError otherwise
        """
        # Base implementation just returns True
        # Specific types should implement schema validation
        return True

class ConfigurationVersion(BaseModel):
    """Information about a specific version of a configuration."""
    config_id: str = Field(..., description="Configuration identifier")
    config_type: str = Field(..., description="Configuration type")
    version: str = Field(..., description="Version string")
    commit_hash: str = Field(..., description="Git commit hash")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    author: str = Field(..., description="Author of the commit")
    message: str = Field(..., description="Commit message")
    configuration: Configuration = Field(..., description="The configuration at this version")
