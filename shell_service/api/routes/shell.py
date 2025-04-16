"""
API routes for the Preferences Shell Service.
Provides endpoints for the frontend shell to fetch its configuration
and save user preferences.
"""

from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List, Dict, Any
import logging

from models.preferences import ( # Assuming models are in ../models/
    ShellConfigurationResponse,
    ShellPreferencesRequest,
    AppDefinition,
    ServiceEndpoints,
    Frame
)

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/shell", tags=["shell_preferences"])

# --- Stubbed Data (Replace with database interaction later) ---

DEFAULT_AVAILABLE_APPS = [
    AppDefinition(id='config-selector', name='Configuration Manager', scope='configSelector', module='./ConfigManager'),
    AppDefinition(id='job-management', name='Job Manager', scope='jobManagement', module='./JobManager'),
    AppDefinition(id='yaml-editor', name='YAML Editor', scope='yamlEditor', module='./YamlEditor'),
]
DEFAULT_FRAMES = [ Frame(id='default-configs', name='Configurations', order=0, assignedApps=[{'appId': 'config-selector'}]) ]
DEFAULT_ENDPOINTS = ServiceEndpoints(jobConfigServiceUrl="http://localhost:8000") # Default Job/Config service URL

# --- API Endpoints ---

@router.get("/configuration", response_model=ShellConfigurationResponse)
async def get_shell_configuration():
    """Stub: Returns the default shell configuration."""
    logger.info("Serving default shell configuration (stub)")
    # In real implementation, fetch user-specific frames, available apps, and endpoints
    return ShellConfigurationResponse(
        frames=DEFAULT_FRAMES,
        availableApps=DEFAULT_AVAILABLE_APPS,
        serviceEndpoints=DEFAULT_ENDPOINTS
    )

@router.put("/preferences")
async def save_shell_preferences(preferences: ShellPreferencesRequest = Body(...)):
    """Stub: Accepts and logs user preferences."""
    logger.info(f"Received preferences update (stub): {len(preferences.frames)} frames")
    # In real implementation, validate and save preferences to database for the user
    # For now, just log and return success
    return {"message": "Preferences received (stub implementation)."}