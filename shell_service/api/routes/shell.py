# File: /Users/jim/src/apps/c4h_editor_aidev/shell_service/api/routes/shell.py
# --- CORRECTED Version ---
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
import os # Added os import for environ access (though config module handles it)

# Correct import path for database/models/config if running from project root
# Adjust based on how you run the service (e.g., uvicorn shell_service.main:app)
try:
    from shell_service.database import crud
    from shell_service.config import CURRENT_ENV_CONFIG # Import environment config
    from shell_service.models.preferences import (
        ShellConfigurationResponse,
        ShellPreferencesRequest,
        AppDefinition,
        # AppConfig, # AppConfig might not be used directly here
        ServiceEndpoints,
        Frame
    )
except ImportError:
    # Fallback for potential direct execution or testing issues
    # This might indicate a PYTHONPATH issue if it occurs during normal startup
    print("Warning: Could not perform relative import, trying absolute.")
    # Assuming db, config, models are sibling directories or in PYTHONPATH
    from database import crud # type: ignore
    from config import CURRENT_ENV_CONFIG # type: ignore
    from models.preferences import ( # type: ignore
        ShellConfigurationResponse,
        ShellPreferencesRequest,
        AppDefinition,
        # AppConfig,
        ServiceEndpoints,
        Frame
    )


# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/shell", tags=["shell_preferences"])

# Simple user extraction from headers (replace with your auth system)
async def get_current_user(x_user_id: Optional[str] = Header(None)):
    """Extract user ID from headers or use default."""
    # In a real app, you'd validate this user ID against a session or token
    user = x_user_id or "default_user" # Use a consistent default if anonymous needed
    logger.debug(f"Extracted user_id: {user}")
    return user

@router.get("/configuration", response_model=ShellConfigurationResponse)
async def get_shell_configuration(user_id: str = Depends(get_current_user)):
    """
    Retrieves the complete shell configuration including user frames,
    available microfrontend apps, and backend service endpoints, using
    environment-specific overrides where applicable.
    """
    logger.info(f"Fetching shell configuration for user: {user_id}")
    try:
        # Fetch base data from DB
        user_frames = await crud.get_user_frames(user_id)
        db_available_apps = await crud.get_available_apps()
        db_service_endpoints = await crud.get_service_endpoints() # Gets DB/default endpoints

        # --- Determine the single correct URL for the running config-selector MFE ---
        # Get it from the environment config, using a specific key like 'config-selector-teams'
        # IMPORTANT: Ensure this key exists and has the correct URL in your environments.json
        # IMPORTANT: Use the correct filename (e.g., config-selector.js) from your Vite build!
        config_selector_config = CURRENT_ENV_CONFIG.get('config-selector-teams', {}) # Example key
        config_selector_running_url = config_selector_config.get('url', '')
        # Adjust filename if necessary based on Vite build output for config-selector
        if config_selector_running_url and 'remoteEntry.js' in config_selector_running_url:
             # Example adjustment - check your actual filename!
             config_selector_running_url = config_selector_running_url.replace('remoteEntry.js', 'config-selector.js')
             logger.info(f"Adjusted config-selector running URL: {config_selector_running_url}")
        # --- End Determine Config Selector URL ---


        # --- Process Available Apps URLs ---
        available_apps = []
        for app_def in db_available_apps:
            # Create a copy to potentially modify
            app = copy.deepcopy(app_def)
            env_app_config = {} # Default to empty

            # --- Logic to assign CORRECT URL based on ID ---
            if app.id.startswith("config-selector-"):
                # Assign the single running URL to all config-selector variants
                if config_selector_running_url:
                    app.url = config_selector_running_url
                    logger.debug(f"Assigning running config-selector URL to {app.id}: {app.url}")
                else:
                    logger.warning(f"No running URL found in environment for config-selector key used. App '{app.id}' URL from DB: {app.url}")
                    # Keep DB URL as fallback
            else:
                # For other apps, check if their specific key exists in env config
                env_app_config = CURRENT_ENV_CONFIG.get(app.id, {}) # Use app.id as the key
                env_url = env_app_config.get("url")
                if env_url and isinstance(env_url, str):
                    app.url = env_url # Override with environment URL
                    logger.debug(f"Using environment URL for app {app.id}: {app.url}")
                # else:
                    # logger.debug(f"Using DB/default URL for app {app.id}: {app.url}")
            # --- End URL Assignment Logic ---

            available_apps.append(app)
        # --- End App URL Processing ---


        # --- Process Service Endpoints URL ---
        # Start with the endpoint object fetched from DB/defaults
        service_endpoints = db_service_endpoints

        # Check for 'main_backend' configuration in the loaded environment JSON
        main_backend_config = CURRENT_ENV_CONFIG.get("main_backend")
        if main_backend_config and isinstance(main_backend_config, dict):
             # Extract the 'url' string from the main_backend object
             backend_url_from_config = main_backend_config.get("url")
             if backend_url_from_config and isinstance(backend_url_from_config, str):
                 # Assign the *string* URL directly to the field
                 service_endpoints.jobConfigServiceUrl = backend_url_from_config
                 logger.info(f"Using environment-specific URL for main backend: {service_endpoints.jobConfigServiceUrl}")
             else:
                 logger.warning("Found 'main_backend' in env config but 'url' key was missing or not a string. Using DB/default URL: %s", service_endpoints.jobConfigServiceUrl)
        else:
             logger.info("No 'main_backend' object found in environment config. Using DB/default URL: %s", service_endpoints.jobConfigServiceUrl)
        # --- End Service Endpoint URL Processing ---

        # Log the final response structure being sent
        logger.debug(f"Final configuration being returned for user {user_id}: Frames={len(user_frames)}, Apps={len(available_apps)}, Endpoints={service_endpoints.model_dump()}")

        # Return the final composed configuration
        return ShellConfigurationResponse(
            frames=user_frames,
            availableApps=available_apps,
            serviceEndpoints=service_endpoints # Contains the correctly formatted string URL now
        )
    except Exception as e:
        logger.error(f"Error fetching shell configuration for user {user_id}: {e}", exc_info=True)
        # Raise HTTPException to return a 500 error to the client
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
        # Basic check for missing or potentially invalid IDs
        if not frame.id or not isinstance(frame.id, str) or len(frame.id) < 5:
            new_id = str(uuid.uuid4())
            logger.info(f"Generated new ID '{new_id}' for frame '{frame.name}' (Original ID: {frame.id})")
            frame.id = new_id
        # Ensure order is sequential before saving (can be done here or in crud)
        # Example: preferences.frames.sort(key=lambda f: f.order)
        # for index, frame in enumerate(preferences.frames):
        #     frame.order = index

    try:
        success = await crud.save_user_frames(user_id, preferences.frames)
        if not success:
            # Log specific error from crud if available, otherwise generic message
            logger.error(f"crud.save_user_frames returned False for user {user_id}")
            raise HTTPException(status_code=500, detail="Failed to save preferences to database.")

        return {"message": "Preferences saved successfully."}
    except HTTPException:
        raise # Re-raise HTTPException if it came from CRUD or validation
    except Exception as e:
        logger.error(f"Unexpected error saving shell preferences for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while saving preferences.")

@router.get("/available-apps", response_model=List[AppDefinition])
async def get_available_apps_endpoint(): # Renamed function
    """
    Retrieves the list of available microfrontend apps, applying env overrides.
    (Optional endpoint as apps are also returned in /configuration)
    """
    logger.info("Fetching available apps via dedicated endpoint")
    try:
        # Re-use the logic from get_shell_configuration to get apps with env URLs
        db_available_apps = await crud.get_available_apps()

        # --- Determine the single correct URL for the running config-selector MFE ---
        config_selector_config = CURRENT_ENV_CONFIG.get('config-selector-teams', {}) # Example key
        config_selector_running_url = config_selector_config.get('url', '')
        if config_selector_running_url and 'remoteEntry.js' in config_selector_running_url:
             config_selector_running_url = config_selector_running_url.replace('remoteEntry.js', 'config-selector.js') # Adjust if needed
        # --- End Determine URL ---

        available_apps = []
        for app_def in db_available_apps:
            app = copy.deepcopy(app_def)
            env_app_config = {}

            if app.id.startswith("config-selector-"):
                if config_selector_running_url:
                    app.url = config_selector_running_url
            else:
                env_app_config = CURRENT_ENV_CONFIG.get(app.id, {})
                env_url = env_app_config.get("url")
                if env_url and isinstance(env_url, str):
                    app.url = env_url

            available_apps.append(app)
        return available_apps
    except Exception as e:
        logger.error(f"Error fetching available apps via dedicated endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve available apps.")