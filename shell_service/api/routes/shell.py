"""
API routes for the Preferences Shell Service.
Provides endpoints for the frontend shell to fetch its configuration
and save user preferences.
"""

from fastapi import APIRouter, HTTPException, Body, Depends, Header, Query, Request
from typing import List, Dict, Any, Optional
import logging
import copy
import uuid
import os

# Correct import path
try:
    from shell_service.database import crud
    # Import the function, not the dict
    from shell_service.config import load_environment_config
    from shell_service.models.preferences import (
        ShellConfigurationResponse,
        ShellPreferencesRequest,
        LayoutInfoResponse,
        AppDefinition,
        ServiceEndpoints, LayoutDefinition,
        Frame
    )
except ImportError:
    # Fallback
    print("Warning: Could not perform relative import, trying absolute.")
    from database import crud # type: ignore
    from config import load_environment_config # type: ignore
    from models.preferences import ( # type: ignore
        ShellConfigurationResponse,
        ShellPreferencesRequest,
        LayoutInfoResponse,
        AppDefinition,
        ServiceEndpoints, LayoutDefinition,
        Frame
    )

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/shell", tags=["shell_preferences"])

async def get_current_user(x_user_id: Optional[str] = Header(None)):
    user = x_user_id or "default_user"
    logger.debug(f"Extracted user_id: {user}")
    return user

@router.get("/configuration", response_model=ShellConfigurationResponse)
async def get_shell_configuration(
    request: Request, # Ensure request instance is passed
    user_id: str = Depends(get_current_user)
):
    logger.info(f"Fetching shell configuration for user: {user_id}")
    try:
        # --- Access state directly and log ---
        environment_config = {}
        layout_definitions = {}
        try:
            environment_config = request.app.state.environment_config
            layout_definitions = request.app.state.layout_templates # Direct access
            logger.debug(f"Direct access request.app.state.layout_templates type: {type(layout_definitions)}")
            logger.debug(f"Direct access request.app.state.layout_templates keys: {layout_definitions.keys() if isinstance(layout_definitions, dict) else 'N/A'}")
        except AttributeError as state_err:
            logger.error(f"Error accessing app state during request: {state_err}", exc_info=True)
            # Decide how to handle - fail request or use defaults?
            environment_config = {} # Fallback
            layout_definitions = {} # Fallback

        if not isinstance(layout_definitions, dict):
             logger.error(f"request.app.state.layout_templates is not a dictionary (Type: {type(layout_definitions)}). Resetting to empty dict.")
             layout_definitions = {}
        # --- End State Access ---


        if not environment_config:
             logger.warning("Environment configuration not found in app state during request!")

        # Fetch base data from DB
        user_frames = await crud.get_user_frames(user_id)
        db_available_apps = await crud.get_available_apps()
        db_service_endpoints = await crud.get_service_endpoints()

        layout_ids_in_use = {frame.layoutId for frame in user_frames if hasattr(frame, 'layoutId') and frame.layoutId}
        # Use the layout_definitions fetched from state
        filtered_layouts = [layout_def for layout_id, layout_def in layout_definitions.items() if layout_id in layout_ids_in_use]
        logger.debug(f"Including {len(filtered_layouts)} layout definitions for user {user_id}")

        # --- Process Available Apps URLs ---
        config_selector_config = environment_config.get('config-selector-teams', {})
        config_selector_running_url = config_selector_config.get('url', '')
        available_apps = []
        for app_def in db_available_apps:
            app = copy.deepcopy(app_def)
            env_app_config = {}
            if app.id.startswith("config-selector-"):
                if config_selector_running_url: app.url = config_selector_running_url
            else:
                env_app_config = environment_config.get(app.id, {})
                env_url = env_app_config.get("url")
                if env_url and isinstance(env_url, str): app.url = env_url
            available_apps.append(app)
        # --- End App URL Processing ---

        # --- Process Service Endpoints URL ---
        service_endpoints = db_service_endpoints
        main_backend_config = environment_config.get("main_backend")
        if main_backend_config and isinstance(main_backend_config, dict):
            backend_url_from_config = main_backend_config.get("url")
            if backend_url_from_config and isinstance(backend_url_from_config, str):
                service_endpoints.jobConfigServiceUrl = backend_url_from_config
                logger.info(f"Using environment URL for main backend: {service_endpoints.jobConfigServiceUrl}")
            else:
                logger.warning("main_backend found but 'url' missing/invalid. Using DB/default: %s", service_endpoints.jobConfigServiceUrl)
        else:
            logger.info("No main_backend in env config. Using DB/default: %s", service_endpoints.jobConfigServiceUrl)
        # --- End Service Endpoint URL Processing ---

        logger.debug(f"Final configuration for user {user_id}: Frames={len(user_frames)}, Apps={len(available_apps)}, Layouts={len(filtered_layouts)}, Endpoints={service_endpoints.model_dump()}")

        return ShellConfigurationResponse(
            frames=user_frames,
            availableApps=available_apps,
            serviceEndpoints=service_endpoints,
            layouts=filtered_layouts
        )
    except Exception as e:
        logger.error(f"Error fetching shell configuration for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve shell configuration.")


@router.put("/preferences")
async def save_shell_preferences(
    preferences: ShellPreferencesRequest = Body(...),
    user_id: str = Depends(get_current_user)
):
    logger.info(f"Saving preferences for user: {user_id} ({len(preferences.frames)} frames)")
    # (Keep validation logic from previous correct version)
    for frame in preferences.frames:
        if not frame.id or not isinstance(frame.id, str) or len(frame.id) < 5:
            frame.id = str(uuid.uuid4())
        if frame.layoutId:
            for app_assignment in frame.assignedApps:
                # Ensure windowId exists before checking its value
                if not hasattr(app_assignment, 'windowId') or app_assignment.windowId is None:
                    app_assignment.windowId = 1
    try:
        success = await crud.save_user_frames(user_id, preferences.frames)
        if not success:
            logger.error(f"crud.save_user_frames returned False for user {user_id}")
            raise HTTPException(status_code=500, detail="Failed to save preferences to database.")
        return {"message": "Preferences saved successfully."}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"Unexpected error saving shell preferences for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while saving preferences.")


@router.get("/available-apps", response_model=List[AppDefinition])
async def get_available_apps_endpoint(request: Request): # Add request
    logger.info("Fetching available apps via dedicated endpoint")
    try:
        # Access environment config from app state
        environment_config = getattr(request.app.state, "environment_config", {})
        db_available_apps = await crud.get_available_apps()
        config_selector_config = environment_config.get('config-selector-teams', {})
        config_selector_running_url = config_selector_config.get('url', '')
        available_apps = []
        for app_def in db_available_apps:
            app = copy.deepcopy(app_def)
            env_app_config = {}
            if app.id.startswith("config-selector-"):
                if config_selector_running_url: app.url = config_selector_running_url
            else:
                env_app_config = environment_config.get(app.id, {})
                env_url = env_app_config.get("url")
                if env_url and isinstance(env_url, str): app.url = env_url
            available_apps.append(app)
        return available_apps
    except Exception as e:
        logger.error(f"Error fetching available apps via dedicated endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve available apps.")


@router.get("/layouts", response_model=List[LayoutInfoResponse])
async def get_layout_templates(request: Request):
    logger.info("Fetching available layout templates")
    try:
        # --- Access state directly and log ---
        layout_definitions = {}
        try:
            layout_definitions = request.app.state.layout_templates # Direct access
            logger.debug(f"Direct access request.app.state.layout_templates type: {type(layout_definitions)}")
            logger.debug(f"Direct access request.app.state.layout_templates keys: {layout_definitions.keys() if isinstance(layout_definitions, dict) else 'N/A'}")
        except AttributeError as state_err:
            logger.error(f"Error accessing app state during request: {state_err}", exc_info=True)
            layout_definitions = {} # Fallback

        if not isinstance(layout_definitions, dict):
             logger.error(f"request.app.state.layout_templates is not a dictionary (Type: {type(layout_definitions)}). Resetting to empty dict.")
             layout_definitions = {}
        # --- End State Access ---

        if not layout_definitions:
            logger.warning("No layout templates found in application state")
            return []

        layout_info_list = [
            LayoutInfoResponse(
                id=layout.id, name=layout.name, description=layout.description,
                window_count=len(layout.windows)
            ) for layout in layout_definitions.values() # Iterate through dict values
        ]
        logger.info(f"Returning {len(layout_info_list)} layout templates.")
        return layout_info_list
    except Exception as e:
        logger.error(f"Error fetching layout templates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve layout templates.")
    
@router.get("/layouts/{layout_id}", response_model=LayoutDefinition)
async def get_layout_template(request: Request, layout_id: str):
    """Get the complete definition for a specific layout template."""
    logger.info(f"Fetching layout template for ID: {layout_id}")
    try:
        # Access layout definitions from app state
        layout_definitions = getattr(request.app.state, "layout_templates", {})
        
        if not isinstance(layout_definitions, dict):
            logger.error(f"request.app.state.layout_templates is not a dictionary (Type: {type(layout_definitions)})")
            raise HTTPException(status_code=500, detail="Server error: Invalid layout storage format")
            
        # Find the layout with the specified ID
        if layout_id in layout_definitions:
            layout = layout_definitions[layout_id]
            logger.info(f"Found layout template: {layout_id}")
            return layout
        else:
            logger.warning(f"Layout template not found: {layout_id}")
            available_layouts = list(layout_definitions.keys())
            raise HTTPException(
                status_code=404, 
                detail=f"Layout '{layout_id}' not found. Available layouts: {available_layouts}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching layout template {layout_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving layout template: {str(e)}")
