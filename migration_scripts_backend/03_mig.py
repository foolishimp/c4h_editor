#!/usr/bin/env python
# Script to create TeamConfig and RuntimeConfig models

import os
import sys
from pathlib import Path

# Ensure backend directory exists
backend_dir = Path("backend")
if not backend_dir.exists():
    print("Error: backend directory not found")
    sys.exit(1)

# Ensure models directory exists
models_dir = backend_dir / "models"
if not models_dir.exists():
    print("Error: models directory not found")
    sys.exit(1)

# Create teamconfig.py
teamconfig_model_path = models_dir / "teamconfig.py"
with open(teamconfig_model_path, "w") as f:
    f.write("""# backend/models/teamconfig.py
\"\"\"
TeamConfig model for defining agent teams and their capabilities.
\"\"\"

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from backend.models.configuration import Configuration, ConfigurationMetadata, ConfigurationVersion

class AgentRole(BaseModel):
    \"\"\"Definition of an agent's role within a team.\"\"\"
    name: str = Field(..., description="Name of the role")
    description: Optional[str] = Field(None, description="Description of the role")
    capabilities: List[str] = Field(default_factory=list, description="Capabilities of the role")
    model: Optional[str] = Field(None, description="LLM model for this role")
    config: Dict[str, Any] = Field(default_factory=dict, description="Configuration for this role")

class Agent(BaseModel):
    \"\"\"Definition of an agent within a team.\"\"\"
    id: str = Field(..., description="Unique identifier for the agent")
    name: str = Field(..., description="Name of the agent")
    role: str = Field(..., description="Role of the agent")
    description: Optional[str] = Field(None, description="Description of the agent")
    config: Dict[str, Any] = Field(default_factory=dict, description="Agent-specific configuration")

class Team(BaseModel):
    \"\"\"Definition of a team of agents.\"\"\"
    name: str = Field(..., description="Name of the team")
    description: Optional[str] = Field(None, description="Description of the team")
    agents: List[Agent] = Field(default_factory=list, description="Agents in the team")
    workflow: Optional[Dict[str, Any]] = Field(None, description="Team workflow configuration")

class TeamConfigContent(BaseModel):
    \"\"\"Content of a team configuration.\"\"\"
    roles: List[AgentRole] = Field(default_factory=list, description="Available agent roles")
    teams: List[Team] = Field(default_factory=list, description="Teams of agents")
    default_team: Optional[str] = Field(None, description="Default team to use")
    global_config: Dict[str, Any] = Field(default_factory=dict, description="Global team configuration")

class TeamConfig(Configuration):
    \"\"\"Configuration for agent teams and their capabilities.\"\"\"
    config_type: str = "teamconfig"
    content: TeamConfigContent

    @classmethod
    def create(cls, id: str, content: TeamConfigContent, metadata: Optional[ConfigurationMetadata] = None):
        \"\"\"Create a new TeamConfig.\"\"\"
        if metadata is None:
            metadata = ConfigurationMetadata(author="system")
            
        return cls(
            id=id,
            config_type="teamconfig",
            content=content,
            metadata=metadata
        )

class TeamConfigVersion(ConfigurationVersion):
    \"\"\"Information about a specific version of a team configuration.\"\"\"
    configuration: TeamConfig
""")

print(f"Created {teamconfig_model_path}")

# Create runtimeconfig.py
runtimeconfig_model_path = models_dir / "runtimeconfig.py"
with open(runtimeconfig_model_path, "w") as f:
    f.write("""# backend/models/runtimeconfig.py
\"\"\"
RuntimeConfig model for managing operational aspects of the C4H Service.
\"\"\"

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator

from backend.models.configuration import Configuration, ConfigurationMetadata, ConfigurationVersion

class ResourceLimits(BaseModel):
    \"\"\"Resource limits for service execution.\"\"\"
    max_tokens: Optional[int] = Field(None, description="Maximum tokens per request")
    max_runtime: Optional[int] = Field(None, description="Maximum runtime in seconds")
    max_concurrent_jobs: Optional[int] = Field(None, description="Maximum concurrent jobs")
    token_bucket_size: Optional[int] = Field(None, description="Token bucket size for rate limiting")
    token_refill_rate: Optional[float] = Field(None, description="Token refill rate per second")

class NotificationConfig(BaseModel):
    \"\"\"Configuration for job notifications.\"\"\"
    enabled: bool = Field(True, description="Whether notifications are enabled")
    on_completion: bool = Field(True, description="Notify on job completion")
    on_failure: bool = Field(True, description="Notify on job failure")
    channels: List[str] = Field(default_factory=list, description="Notification channels")
    webhook_url: Optional[str] = Field(None, description="Webhook URL for notifications")

class ModelConfig(BaseModel):
    \"\"\"Configuration for a specific LLM model.\"\"\"
    provider: str = Field(..., description="Model provider (e.g., anthropic, openai)")
    model_id: str = Field(..., description="Model identifier")
    version: Optional[str] = Field(None, description="Model version")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Model parameters")
    enabled: bool = Field(True, description="Whether this model is enabled")

class RuntimeConfigContent(BaseModel):
    \"\"\"Content of a runtime configuration.\"\"\"
    resource_limits: ResourceLimits = Field(default_factory=ResourceLimits, description="Resource limits")
    notifications: NotificationConfig = Field(default_factory=NotificationConfig, description="Notification configuration")
    models: Dict[str, ModelConfig] = Field(default_factory=dict, description="Available models")
    default_model: Optional[str] = Field(None, description="Default model to use")
    environment_variables: Dict[str, str] = Field(default_factory=dict, description="Environment variables")
    feature_flags: Dict[str, bool] = Field(default_factory=dict, description="Feature flags")

class RuntimeConfig(Configuration):
    \"\"\"Configuration for runtime operational aspects of the C4H Service.\"\"\"
    config_type: str = "runtimeconfig"
    content: RuntimeConfigContent

    @classmethod
    def create(cls, id: str, content: RuntimeConfigContent, metadata: Optional[ConfigurationMetadata] = None):
        \"\"\"Create a new RuntimeConfig.\"\"\"
        if metadata is None:
            metadata = ConfigurationMetadata(author="system")
            
        return cls(
            id=id,
            config_type="runtimeconfig",
            content=content,
            metadata=metadata
        )

class RuntimeConfigVersion(ConfigurationVersion):
    \"\"\"Information about a specific version of a runtime configuration.\"\"\"
    configuration: RuntimeConfig
""")

print(f"Created {runtimeconfig_model_path}")

print("TeamConfig and RuntimeConfig Models created successfully.")