"""
CRUD operations for the Preferences Shell Service.
"""

import logging
from typing import List, Optional, Dict, Any
import json # Import json module
from pathlib import Path
import uuid
import aiosqlite # Import needed for type checking

# Adjust import path if necessary for your structure
try:
    from . import db # Note the leading dot '.'
    # Ensure models are imported correctly relative to this file's location
    from shell_service.models.preferences import Frame, AppDefinition, ServiceEndpoints, AppAssignment # type: ignore
except ImportError:
    # Fallback for potential execution as script? Adjust as needed.
    import db # type: ignore
    from models.preferences import Frame, AppDefinition, ServiceEndpoints, AppAssignment # type: ignore


logger = logging.getLogger(__name__)

# Default values for when database is unavailable
DEFAULT_FRAMES: List[Frame] = []
DEFAULT_AVAILABLE_APPS: List[AppDefinition] = []
# Define default endpoint URL reliably here
DEFAULT_ENDPOINT_URL = "http://localhost:8000"
DEFAULT_ENDPOINTS = ServiceEndpoints(jobConfigServiceUrl=DEFAULT_ENDPOINT_URL)

async def get_user_frames(user_id: str) -> List[Frame]:
    """Retrieve frames for a user."""
    try:
        is_healthy = await db.check_health()
        if is_healthy:
            rows = await db.execute(
                """
                SELECT id, name, "order", assigned_apps
                FROM frames
                WHERE user_id = $1
                ORDER BY "order"
                """,
                user_id,
                fetch_type="all" # Specify fetch_type
            )
            logger.info(f"[GET FRAMES] Raw rows fetched for user {user_id} ({len(rows)}): {rows}")

            if not rows:
                logger.info(f"No frames found for user {user_id}, returning empty list")
                return [] # Return empty list explicitly

            frames = []
            for i, row in enumerate(rows):
                logger.debug(f"[GET FRAMES] Processing row {i}: {dict(row) if row else 'None'}")
                frame_to_add = None # Initialize frame for this row as None
                try:
                    # --- Enhanced Logging & Validation ---
                    assigned_apps_list = []
                    assigned_apps_raw = row['assigned_apps'] if 'assigned_apps' in row else '[]' # Default to empty JSON array string
                    logger.debug(f"[GET FRAMES] Row {i} - Raw assigned_apps from DB: {assigned_apps_raw}")

                    try:
                        # Deserialize assigned_apps from TEXT column
                        assigned_apps_data = json.loads(assigned_apps_raw) if assigned_apps_raw else []
                        logger.debug(f"[GET FRAMES] Row {i} - Parsed assigned_apps_data: {assigned_apps_data}")
                        # Validate structure basic check - ensure it's a list
                        if not isinstance(assigned_apps_data, list):
                             logger.warning(f"[GET FRAMES] Row {i} - Parsed assigned_apps_data is not a list: {type(assigned_apps_data)}")
                             assigned_apps_data = []

                        # Try to create AppAssignment objects
                        temp_app_assignments = []
                        parse_success = True
                        for app_dict in assigned_apps_data:
                             if isinstance(app_dict, dict) and 'appId' in app_dict:
                                 temp_app_assignments.append(AppAssignment(**app_dict))
                             else:
                                 logger.warning(f"[GET FRAMES] Row {i} - Invalid item in assigned_apps_data: {app_dict}")
                                 parse_success = False # Mark failure but continue parsing others if possible
                        if parse_success:
                             assigned_apps_list = temp_app_assignments
                        else:
                             # Decide if partial success is okay or clear the list
                             logger.warning(f"[GET FRAMES] Row {i} - Some AppAssignment objects failed to parse.")
                             # assigned_apps_list = [] # Option: Clear list if any item fails
                    except json.JSONDecodeError:
                        logger.warning(f"[GET FRAMES] Row {i} - Could not decode assigned_apps JSON. Content: {assigned_apps_raw}")
                        assigned_apps_list = [] # Default to empty list on JSON error

                    # Check essential fields for the Frame itself
                    row_id = row['id'] if 'id' in row else None
                    row_name = row['name'] if 'name' in row else None
                    row_order = row['order'] if 'order' in row else None

                    if row_id is not None and row_name is not None and row_order is not None:
                         logger.debug(f"[GET FRAMES] Row {i} - Basic frame fields OK. Creating Frame object.")
                         # Construct Frame object
                         frame_to_add = Frame(
                             id=row_id, name=row_name,
                             order=row_order,
                             assignedApps=assigned_apps_list # Use the parsed list
                         )
                         logger.debug(f"[GET FRAMES] Row {i} - Successfully created Frame object.")
                    else:
                         # Log row content as dict for better debugging if possible
                         try: row_dict = dict(row)
                         except TypeError: row_dict = repr(row)
                         logger.warning(f"[GET FRAMES] Row {i} - Skipping row due to missing essential frame data (id, name, or order): {row_dict}")
                    # --- End Enhanced Logging & Validation ---

                except (KeyError, IndexError, TypeError, Exception) as e:
                    # Catch potential errors accessing row data or during Pydantic validation
                     try: row_dict = dict(row)
                     except TypeError: row_dict = repr(row)
                     logger.error(f"[GET FRAMES] Error processing row {i}: {e}. Row data: {row_dict}", exc_info=True)
                     frame_to_add = None # Ensure frame is not added on error

                # Add the successfully constructed frame
                if frame_to_add:
                    frames.append(frame_to_add)

            logger.info(f"[GET FRAMES] Finished processing {len(rows)} rows, constructed {len(frames)} Frame objects for user {user_id}.")
            return frames
        else:
            logger.warning(f"Database unavailable in get_user_frames. Returning default frames for user {user_id}")
            return DEFAULT_FRAMES # This is []
    except Exception as e:
        logger.error(f"Outer error fetching frames for user {user_id}: {e}", exc_info=True)
        return DEFAULT_FRAMES # Return default on error

async def save_user_frames(user_id: str, frames: List[Frame]) -> bool:
    """Save frames for a user, overwriting existing ones."""
    try:
        # Check health before proceeding
        if not await db.check_health():
            logger.warning(f"Database unavailable. Cannot save frames for user {user_id}")
            return False

        # Use get_connection context manager to ensure connection is available
        async with db.get_connection() as conn:
            # Delete existing frames for this user
            logger.info(f"[SAVE FRAMES] Deleting existing frames for user {user_id}...")
            await db.execute("DELETE FROM frames WHERE user_id = $1", user_id, fetch_type="status")
            logger.info(f"[SAVE FRAMES] Finished deleting.")

            # Insert new frames
            logger.info(f"[SAVE FRAMES] Inserting {len(frames)} new frames for user {user_id}...")
            for frame in frames:
                # Serialize assignedApps to JSON string for TEXT column
                assigned_apps_json = json.dumps([app.model_dump() for app in frame.assignedApps])
                logger.debug(f"[SAVE FRAMES] Inserting frame ID {frame.id}, Order {frame.order}, Apps JSON: {assigned_apps_json[:100]}...") # Log snippet
                await db.execute(
                    """
                    INSERT INTO frames(id, user_id, name, "order", assigned_apps)
                    VALUES($1, $2, $3, $4, $5)
                    """,
                    frame.id or str(uuid.uuid4()),
                    user_id, frame.name,
                    frame.order,
                    assigned_apps_json, # Pass JSON string
                    fetch_type="status" # Use status to ensure commit happens in SQLite mode
                )

            # --- EXPLICIT COMMIT for SQLite ---
            if db.DB_TYPE == "sqlite":
                # Ensure conn is the correct type before calling commit
                if isinstance(conn, aiosqlite.Connection):
                     logger.info("[SAVE FRAMES] Explicitly committing SQLite transaction.")
                     await conn.commit()
                else:
                     logger.warning("[SAVE FRAMES] Expected aiosqlite.Connection for explicit commit, but got different type. Skipping commit.")
            # --- END EXPLICIT COMMIT ---

        logger.info(f"Successfully saved {len(frames)} frames for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving frames for user {user_id}: {e}", exc_info=True)
        return False

async def get_available_apps() -> List[AppDefinition]:
    """Retrieve list of available apps."""
    # (Code remains the same as previous correct version)
    try:
        is_healthy = await db.check_health()
        logger.info(f"[SERVICE CRUD get_available_apps] Result of db.check_health(): {is_healthy}")
        if is_healthy:
            rows = await db.execute(
                """
                SELECT id, name, scope, module, url
                FROM available_apps
                ORDER BY name
                """,
                 fetch_type="all"
            )
            logger.info(f"[SERVICE CRUD] Raw rows fetched from available_apps ({len(rows)}): {rows}")

            if not rows:
                logger.info("No apps found in database, returning default (empty list)")
                return []

            apps = []
            for row in rows:
                 try:
                     row_id = row['id']
                     row_name = row['name']
                     row_scope = row['scope']
                     row_module = row['module']
                     if row_id is not None and row_name is not None and row_scope is not None and row_module is not None:
                         row_url = row['url'] if 'url' in row else None
                         app = AppDefinition(
                             id=row_id,
                             name=row_name,
                             scope=row_scope,
                             module=row_module,
                             url=row_url
                         )
                         apps.append(app)
                     else:
                         try: row_dict = dict(row)
                         except TypeError: row_dict = repr(row)
                         logger.warning(f"Skipping row with missing essential app data: {row_dict}")
                 except (KeyError, IndexError, TypeError) as e:
                     logger.warning(f"Error accessing row data: {e}. Row: {repr(row)}")

            logger.info(f"Successfully constructed {len(apps)} AppDefinition objects.")
            return apps
        else:
            logger.warning("Database unavailable in get_available_apps. Returning default apps")
            return DEFAULT_AVAILABLE_APPS
    except Exception as e:
        logger.error(f"Error fetching available apps: {e}", exc_info=True)
        return DEFAULT_AVAILABLE_APPS

async def get_service_endpoints() -> ServiceEndpoints:
    """Retrieve service endpoint configuration."""
    # (Code remains the same as previous correct version)
    try:
        is_healthy = await db.check_health()
        logger.info(f"[SERVICE CRUD get_service_endpoints] Result of db.check_health(): {is_healthy}")
        if is_healthy:
            row = await db.execute(
                """
                SELECT job_config_service_url
                FROM service_endpoints
                WHERE id = 'default'
                """,
                fetch_type="one"
            )

            logger.info(f"[SERVICE CRUD] Raw row fetched from service_endpoints: {row}")

            if not row:
                logger.info("No service endpoints found in database, using defaults")
                return DEFAULT_ENDPOINTS

            job_url = None
            if hasattr(row, '__contains__') and 'job_config_service_url' in row and row['job_config_service_url'] is not None:
                 job_url = row['job_config_service_url']
            else:
                 job_url = DEFAULT_ENDPOINT_URL

            logger.info(f"Found job_config_service_url: {job_url} (Using default if DB value was None/missing)")
            return ServiceEndpoints(
                jobConfigServiceUrl=job_url
            )
        else:
            logger.warning("Database unavailable in get_service_endpoints. Returning default endpoints")
            return DEFAULT_ENDPOINTS
    except Exception as e:
        logger.error(f"Error fetching service endpoints: {e}", exc_info=True)
        return DEFAULT_ENDPOINTS

async def initialize_default_data():
    """Initialize database with default apps and endpoints if they don't exist."""
    # (Code remains the same as previous correct version)
    try:
        if not await db.check_health():
            logger.warning("Database unavailable during initialize_default_data. Cannot initialize.")
            return

        if not DEFAULT_AVAILABLE_APPS:
             logger.warning("DEFAULT_AVAILABLE_APPS list is empty in crud.py. Cannot populate default apps.")
        else:
            logger.info(f"Initializing/Checking {len(DEFAULT_AVAILABLE_APPS)} default apps...")
            for app in DEFAULT_AVAILABLE_APPS:
                await db.execute(
                    """
                    INSERT INTO available_apps(id, name, scope, module, url) VALUES($1, $2, $3, $4, $5)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    app.id, app.name, app.scope, app.module, app.url,
                    fetch_type="status"
                )
            logger.info("Default apps checked/inserted.")

        logger.info(f"Initializing/Checking default endpoints with URL: {DEFAULT_ENDPOINTS.jobConfigServiceUrl}")
        if DEFAULT_ENDPOINTS and DEFAULT_ENDPOINTS.jobConfigServiceUrl is not None:
            await db.execute(
                """
                INSERT INTO service_endpoints(id, job_config_service_url)
                VALUES('default', $1)
                ON CONFLICT (id) DO UPDATE SET
                    job_config_service_url = $1
                """,
                DEFAULT_ENDPOINTS.jobConfigServiceUrl,
                fetch_type="status"
            )
            logger.info("Default endpoints checked/upserted.")
        else:
             logger.warning("DEFAULT_ENDPOINTS not configured correctly, skipping endpoint initialization.")

        logger.info("Default data initialization check/update completed successfully")
        return True
    except Exception as e:
         logger.error(f"Error during default data initialization: {e}", exc_info=True)
         return False