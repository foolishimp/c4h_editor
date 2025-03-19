# backend/models/teamconfig.py
"""
TeamConfig model for defining agent teams and their capabilities.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from backend.models.configuration import Configuration, ConfigurationMetadata, ConfigurationVersion

class AgentRole(BaseModel):
    """Definition of an agent's role within a team."""
    name: str = Field(..., description="Name of the role")
    description: Optional[str] = Field(None, description="Description of the role")
    capabilities: List[str] = Field(default_factory=list, description="Capabilities of the role")
    model: Optional[str] = Field(None, description="LLM model for this role")
    config: Dict[str, Any] = Field(default_factory=dict, description="Configuration for this role")

class Agent(BaseModel):
    """Definition of an agent within a team."""
    id: str = Field(..., description="Unique identifier for the agent")
    name: str = Field(..., description="Name of the agent")
    role: str = Field(..., description="Role of the agent")
    description: Optional[str] = Field(None, description="Description of the agent")
    config: Dict[str, Any] = Field(default_factory=dict, description="Agent-specific configuration")

class Team(BaseModel):
    """Definition of a team of agents."""
    name: str = Field(..., description="Name of the team")
    description: Optional[str] = Field(None, description="Description of the team")
    agents: List[Agent] = Field(default_factory=list, description="Agents in the team")
    workflow: Optional[Dict[str, Any]] = Field(None, description="Team workflow configuration")

class TeamConfigContent(BaseModel):
    """Content of a team configuration."""
    roles: List[AgentRole] = Field(default_factory=list, description="Available agent roles")
    teams: List[Team] = Field(default_factory=list, description="Teams of agents")
    default_team: Optional[str] = Field(None, description="Default team to use")
    global_config: Dict[str, Any] = Field(default_factory=dict, description="Global team configuration")

class TeamConfig(Configuration):
    """Configuration for agent teams and their capabilities."""
    config_type: str = "teamconfig"
    content: TeamConfigContent

    @classmethod
    def create(cls, id: str, content: TeamConfigContent, metadata: Optional[ConfigurationMetadata] = None):
        """Create a new TeamConfig."""
        if metadata is None:
            metadata = ConfigurationMetadata(author="system")
            
        return cls(
            id=id,
            config_type="teamconfig",
            content=content,
            metadata=metadata
        )

class TeamConfigVersion(ConfigurationVersion):
    """Information about a specific version of a team configuration."""
    configuration: TeamConfig
