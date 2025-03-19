# backend/models/runtimeconfig.py
"""
RuntimeConfig model for managing operational aspects of the C4H Service.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator

from backend.models.configuration import Configuration, ConfigurationMetadata, ConfigurationVersion

class ResourceLimits(BaseModel):
    """Resource limits for service execution."""
    max_tokens: Optional[int] = Field(None, description="Maximum tokens per request")
    max_runtime: Optional[int] = Field(None, description="Maximum runtime in seconds")
    max_concurrent_jobs: Optional[int] = Field(None, description="Maximum concurrent jobs")
    token_bucket_size: Optional[int] = Field(None, description="Token bucket size for rate limiting")
    token_refill_rate: Optional[float] = Field(None, description="Token refill rate per second")

class NotificationConfig(BaseModel):
    """Configuration for job notifications."""
    enabled: bool = Field(True, description="Whether notifications are enabled")
    on_completion: bool = Field(True, description="Notify on job completion")
    on_failure: bool = Field(True, description="Notify on job failure")
    channels: List[str] = Field(default_factory=list, description="Notification channels")
    webhook_url: Optional[str] = Field(None, description="Webhook URL for notifications")

class ModelConfig(BaseModel):
    """Configuration for a specific LLM model."""
    provider: str = Field(..., description="Model provider (e.g., anthropic, openai)")
    model_id: str = Field(..., description="Model identifier")
    version: Optional[str] = Field(None, description="Model version")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Model parameters")
    enabled: bool = Field(True, description="Whether this model is enabled")

class RuntimeConfigContent(BaseModel):
    """Content of a runtime configuration."""
    resource_limits: ResourceLimits = Field(default_factory=ResourceLimits, description="Resource limits")
    notifications: NotificationConfig = Field(default_factory=NotificationConfig, description="Notification configuration")
    models: Dict[str, ModelConfig] = Field(default_factory=dict, description="Available models")
    default_model: Optional[str] = Field(None, description="Default model to use")
    environment_variables: Dict[str, str] = Field(default_factory=dict, description="Environment variables")
    feature_flags: Dict[str, bool] = Field(default_factory=dict, description="Feature flags")

class RuntimeConfig(Configuration):
    """Configuration for runtime operational aspects of the C4H Service."""
    config_type: str = "runtimeconfig"
    content: RuntimeConfigContent

    @classmethod
    def create(cls, id: str, content: RuntimeConfigContent, metadata: Optional[ConfigurationMetadata] = None):
        """Create a new RuntimeConfig."""
        if metadata is None:
            metadata = ConfigurationMetadata(author="system")
            
        return cls(
            id=id,
            config_type="runtimeconfig",
            content=content,
            metadata=metadata
        )

class RuntimeConfigVersion(ConfigurationVersion):
    """Information about a specific version of a runtime configuration."""
    configuration: RuntimeConfig
