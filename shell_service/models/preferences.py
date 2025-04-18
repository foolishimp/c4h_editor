"""
Pydantic models for the Preferences Shell Service API.
Defines the structure for Frames, App Definitions, and overall Shell Configuration.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import uuid

# --- Models for UI Configuration ---

class AppAssignment(BaseModel):
    """How an App is assigned within a Frame."""
    appId: str = Field(..., description="The unique ID of the assigned AppDefinition.")
    # layoutInfo: Optional[Dict[str, Any]] = Field(None, description="Optional layout info if multiple apps per frame are supported.")

class Frame(BaseModel):
    """Represents a user-defined workspace tab (Frame) in the Shell."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique identifier for the Frame.")
    name: str = Field(..., description="Display name of the Frame.")
    order: int = Field(0, description="Display order of the Frame.")
    assignedApps: List[AppAssignment] = Field(default_factory=list, description="Apps assigned to this Frame.")

# --- Models for Available Apps and Service Endpoints ---

class AppDefinition(BaseModel):
    """Defines an available microfrontend App that the Shell can load."""
    id: str = Field(..., description="Unique identifier for the App (e.g., 'config-selector').")
    name: str = Field(..., description="Display name of the App (e.g., 'Configuration Manager').")
    scope: str = Field(..., description="Module Federation scope (e.g., 'configSelector').")
    module: str = Field(..., description="Module Federation module name (e.g., './ConfigManager').")
    url: Optional[str] = Field(None, description="URL for the remoteEntry.js if not standard.") # Potentially derived from service discovery

class AppConfig(BaseModel):
    """Configuration for an app in a specific environment."""
    url: Optional[str] = Field(None, description="URL for the app's remoteEntry.js in this environment.")
    # Add other environment-specific app config fields here

class ServiceEndpoints(BaseModel):
    """Defines endpoints for backend services the Shell needs to contact."""
    jobConfigServiceUrl: Optional[str] = Field(None, description="Base URL for the Job/Config Service API.")
    # Add other service endpoints here as needed

# --- API Response/Request Models ---

class ShellConfigurationResponse(BaseModel):
    """Response model for the GET /shell/configuration endpoint."""
    frames: List[Frame] = Field(default_factory=list)
    availableApps: List[AppDefinition] = Field(default_factory=list)
    serviceEndpoints: ServiceEndpoints = Field(default_factory=ServiceEndpoints)

class ShellPreferencesRequest(BaseModel):
    """Request model for the PUT /shell/preferences endpoint."""
    frames: List[Frame] = Field(..., description="The complete, updated list of frames for the user.")
    # Add other preference sections here if needed in the future