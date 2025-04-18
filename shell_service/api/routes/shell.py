"""
API routes for the Preferences Shell Service.
Provides endpoints for the frontend shell to fetch its configuration
and save user preferences.
"""

from fastapi import APIRouter, HTTPException, Body, Depends, Header, Query
from typing import List, Dict, Any, Optional
import logging
import copy
import uuid

# Correct import path for database
from shell_service.database import crud
from shell_service.config import CURRENT_ENV_CONFIG
from shell_service.models.preferences import ( # <-- Use absolute import
    ShellConfigurationResponse,
    ShellPreferencesRequest,
    AppDefinition,
    AppConfig,
    ServiceEndpoints,
    Frame
)
# --- API Endpoints ---

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/shell", tags=["shell_preferences"])

# Simple user extraction from headers (replace with your auth system)
async def get_current_user(x_user_id: Optional[str] = Header(None)):
    """Extract user ID from headers or use default."""
    if not x_user_id:
        return "anonymous"
    return x_user_id

@router.get("/configuration", response_model=ShellConfigurationResponse)
async def get_shell_configuration(user_id: str = Depends(get_current_user)):
    """
    Retrieves the complete shell configuration including user frames,
    available microfrontend apps, and backend service endpoints.
    """
    logger.info(f"Fetching shell configuration for user: {user_id}")
    try:
        # Fetch data using CRUD functions
        user_frames = await crud.get_user_frames(user_id)
        db_available_apps = await crud.get_available_apps()
        db_service_endpoints = await crud.get_service_endpoints()
        
        # Update app URLs with environment-specific values
        available_apps = []
        for app_def in db_available_apps:
            # Create a deep copy to avoid modifying the original
            app = copy.deepcopy(app_def)
            
            # Check if this app has environment-specific config
            if app.id in CURRENT_ENV_CONFIG:
                env_app_config = CURRENT_ENV_CONFIG[app.id]
                if isinstance(env_app_config, dict) and "url" in env_app_config:
                    app.url = env_app_config["url"]
                    logger.info(f"Using environment-specific URL for app {app.id}: {app.url}")
            available_apps.append(app)
        
        # Override service endpoint URLs with environment config
        service_endpoints = db_service_endpoints
        if "main_backend" in CURRENT_ENV_CONFIG:
            service_endpoints.jobConfigServiceUrl = CURRENT_ENV_CONFIG["main_backend"]
            logger.info(f"Using environment-specific URL for main backend: {service_endpoints.jobConfigServiceUrl}")

        return ShellConfigurationResponse(
            frames=user_frames,
            availableApps=available_apps,
            serviceEndpoints=service_endpoints
        )
    except Exception as e:
        logger.error(f"Error fetching shell configuration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve shell configuration.")

@router.put("/preferences")
async def save_shell_preferences(
    preferences: ShellPreferencesRequest = Body(...),
    user_id: str = Depends(get_current_user)
):
    """Saves the user's frame preferences."""
    logger.info(f"Saving preferences for user: {user_id} ({len(preferences.frames)} frames)")

    # Validate frame IDs and generate any missing ones
    for frame in preferences.frames:
        if not frame.id:
            frame.id = str(uuid.uuid4())
            logger.info(f"Generated ID for frame '{frame.name}': {frame.id}")

    try:
        success = await crud.save_user_frames(user_id, preferences.frames)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save preferences.")

        return {"message": "Preferences saved successfully."}
    except Exception as e:
        logger.error(f"Error saving shell preferences: {e}", exc_info=True)
        # Catch potential validation errors from Pydantic if needed
        raise HTTPException(status_code=500, detail=f"An error occurred while saving preferences: {str(e)}")

@router.get("/available-apps", response_model=List[AppDefinition])
async def get_available_apps():
    """
    Retrieves the list of available microfrontend apps.
    This endpoint is optional as the apps are also returned in /configuration.
    """
    logger.info("Fetching available apps")
    try:
        available_apps = await crud.get_available_apps()
        return available_apps
    except Exception as e:
        logger.error(f"Error fetching available apps: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve available apps.")