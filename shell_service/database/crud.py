"""
CRUD operations for the Preferences Shell Service.
"""

import logging
from typing import List, Optional, Dict, Any
import json # Import json module
from pathlib import Path
import uuid
import aiosqlite # Import needed for type checking
from pydantic import ValidationError # Import Pydantic validation error

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
    # (Code remains the same as previous correct version)
    try:
        is_healthy = await db.check_health()
        if is_healthy:
            rows = await db.execute(
                """
                SELECT id, name, "order", layout_id, assigned_apps
                FROM frames
                WHERE user_id = $1
                ORDER BY "order"
                """,
                user_id,
                fetch_type="all"
            )
            logger.info(f"[GET FRAMES] Raw rows fetched for user {user_id} ({len(rows)}): {rows}")

            if not rows:
                logger.info(f"No frames found for user {user_id}, returning empty list")
                return []

            frames = []
            for i, row in enumerate(rows):
                frame_to_add = None
                frame_id, frame_name, frame_order = None, None, None
                assigned_apps_list = []
                try:
                    frame_id = row[0]
                    frame_name = row[1]
                    frame_order = row[2]
                    layout_id = row[3]
                    assigned_apps_raw = row[4]

                    if frame_id is None or frame_name is None or frame_order is None:  # layout_id can be None
                        logger.warning(f"[GET FRAMES] Row {i} - Missing essential data from DB query result (id='{frame_id}', name='{frame_name}', order='{frame_order}'). Skipping.")
                        continue

                    # Process assigned_apps
                    logger.debug(f"[GET FRAMES] Row {i} - Raw assigned_apps from DB: {assigned_apps_raw}")
                    try:
                        assigned_apps_data = json.loads(assigned_apps_raw) if assigned_apps_raw else []
                        if not isinstance(assigned_apps_data, list):
                             logger.warning(f"[GET FRAMES] Row {i} - Parsed assigned_apps_data is not a list: {type(assigned_apps_data)}")
                             assigned_apps_data = []
                        temp_app_assignments = []
                        parse_success = True
                        for app_index, app_dict in enumerate(assigned_apps_data):
                             if isinstance(app_dict, dict) and 'appId' in app_dict:                                 
                                 # Handle case where windowId might be missing (backward compatibility)
                                 if 'windowId' not in app_dict:
                                     logger.warning(f"[GET FRAMES] Row {i} App {app_index} - Missing windowId in assigned_apps, defaulting to 1: {app_dict}")
                                     app_dict['windowId'] = 1  # Default to window 1 for backward compatibility
                                     
                                 # Ensure windowId is an integer
                                 try:
                                     app_dict['windowId'] = int(app_dict['windowId'])
                                 except (ValueError, TypeError):
                                     app_dict['windowId'] = 1  # Default to window 1 if conversion fails
                                 try:
                                     temp_app_assignments.append(AppAssignment(**app_dict))
                                 except ValidationError as app_ve:
                                     logger.warning(f"[GET FRAMES] Row {i} App {app_index} - Pydantic Validation Error for AppAssignment: {app_ve}. Data: {app_dict}")
                                     parse_success = False
                             else:
                                 logger.warning(f"[GET FRAMES] Row {i} App {app_index} - Invalid item in assigned_apps_data: {app_dict}")
                                 parse_success = False
                        if parse_success:
                             assigned_apps_list = temp_app_assignments
                        else:
                             logger.warning(f"[GET FRAMES] Row {i} - Some AppAssignment objects failed to parse or validate.")
                             assigned_apps_list = temp_app_assignments
                    except json.JSONDecodeError:
                        logger.warning(f"[GET FRAMES] Row {i} - Could not decode assigned_apps JSON. Content: {assigned_apps_raw}")
                        assigned_apps_list = []

                    log_data = { "id": frame_id, "name": frame_name, "order": frame_order, "assignedApps": assigned_apps_list }
                    logger.debug(f"[GET FRAMES] Row {i} - Attempting Frame construction with data: {log_data}, layoutId: {layout_id}")

                    try:
                        frame_to_add = Frame(
                            id=str(frame_id),
                            name=str(frame_name),
                            layoutId=str(layout_id) if layout_id is not None else None,
                            order=int(frame_order),
                            assignedApps=assigned_apps_list
                        )
                        logger.debug(f"[GET FRAMES] Row {i} - Pydantic Frame construction successful.")
                    except ValidationError as ve:
                        logger.error(f"[GET FRAMES] Row {i} - Pydantic Validation Error during Frame construction: {ve}. Input data used: {log_data}", exc_info=False)
                        frame_to_add = None

                except (KeyError, IndexError, TypeError) as e:
                     try: row_dict = dict(row)
                     except TypeError: row_dict = repr(row)
                     logger.error(f"[GET FRAMES] Error processing row {i} before Frame construction: {e}. Row data: {row_dict}", exc_info=True)
                     frame_to_add = None
                except Exception as e:
                    logger.error(f"[GET FRAMES] Unexpected error processing row {i}: {e}", exc_info=True)
                    frame_to_add = None

                if frame_to_add:
                    frames.append(frame_to_add)
                else:
                    logger.warning(f"[GET FRAMES] Row {i} - Frame object was not added to the list (remained None).")

            logger.info(f"[GET FRAMES] Finished processing {len(rows)} rows, constructed {len(frames)} Frame objects for user {user_id}.")
            return frames
        else:
            logger.warning(f"Database unavailable in get_user_frames. Returning default frames for user {user_id}")
            return DEFAULT_FRAMES
    except Exception as e:
        logger.error(f"Outer error fetching frames for user {user_id}: {e}", exc_info=True)
        return DEFAULT_FRAMES

async def save_user_frames(user_id: str, frames: List[Frame]) -> bool:
    # (Code remains the same as previous correct version)
    try:
        if not await db.check_health():
            logger.warning(f"Database unavailable. Cannot save frames for user {user_id}")
            return False

        async with db.get_connection() as conn:
            logger.info(f"[SAVE FRAMES] Deleting existing frames for user {user_id}...")
            await db.execute("DELETE FROM frames WHERE user_id = $1", user_id, fetch_type="status")
            logger.info(f"[SAVE FRAMES] Finished deleting.")

            logger.info(f"[SAVE FRAMES] Inserting {len(frames)} new frames for user {user_id}...")
            for frame in frames:
                assigned_apps_json = json.dumps([app.model_dump() for app in frame.assignedApps])
                logger.debug(f"[SAVE FRAMES] Inserting frame ID {frame.id}, Order {frame.order}, Apps JSON: {assigned_apps_json[:100]}...")
                await db.execute(
                    """
                    INSERT INTO frames(id, user_id, name, "order", layout_id, assigned_apps)
                    VALUES($1, $2, $3, $4, $5, $6)
                    """,
                    frame.id or str(uuid.uuid4()),
                    user_id, frame.name, 
                    frame.order, frame.layoutId,
                    assigned_apps_json,
                    fetch_type="status"
                )

            if db.DB_TYPE == "sqlite":
                if isinstance(conn, aiosqlite.Connection):
                     logger.info("[SAVE FRAMES] Explicitly committing SQLite transaction.")
                     await conn.commit()
                else:
                     logger.warning("[SAVE FRAMES] Expected aiosqlite.Connection for explicit commit, but got different type. Skipping commit.")

        logger.info(f"Successfully saved {len(frames)} frames for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving frames for user {user_id}: {e}", exc_info=True)
        return False

async def get_available_apps() -> List[AppDefinition]:
    """Retrieve list of available apps."""
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
            for i, row in enumerate(rows):
                 try:
                     # --- Access by index ---
                     row_id = row[0]     # id
                     row_name = row[1]   # name
                     row_scope = row[2]  # scope
                     row_module = row[3] # module
                     row_url = row[4]    # url
                     # --- End Access by index ---

                     logger.debug(f"[GET APPS] Row {i} - Values read by index: id='{row_id}', name='{row_name}', scope='{row_scope}', module='{row_module}', url='{row_url}' (type: {type(row_url)})")

                     # Check if essential fields are present and not None
                     if row_id is not None and row_name is not None and row_scope is not None and row_module is not None:
                         app = AppDefinition(
                             id=str(row_id), # Ensure string
                             name=str(row_name),
                             scope=str(row_scope),
                             module=str(row_module),
                             url=str(row_url) if row_url is not None else None # Ensure string or None
                         )
                         apps.append(app)
                     else:
                         try: row_dict = dict(row)
                         except TypeError: row_dict = repr(row)
                         logger.warning(f"Skipping row with missing essential app data (id/name/scope/module): {row_dict}")
                 except (KeyError, IndexError, TypeError) as e:
                     logger.warning(f"Error accessing row data by index for app: {e}. Row: {repr(row)}")

            logger.info(f"Successfully constructed {len(apps)} AppDefinition objects.")
            return apps
        else:
            logger.warning("Database unavailable in get_available_apps. Returning default apps")
            return DEFAULT_AVAILABLE_APPS
    except Exception as e:
        logger.error(f"Error fetching available apps: {e}", exc_info=True)
        return DEFAULT_AVAILABLE_APPS

async def get_service_endpoints() -> ServiceEndpoints:
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
    """Initialize/Check default apps and endpoints in the database."""
    try:
        if not await db.check_health():
            logger.warning("Database unavailable during initialize_default_data. Cannot initialize.")
            # Return False or raise an exception if DB connection is critical for startup
            return False # Indicate initialization failed

        # --- Initialize Apps ---
        # Note: The log shows DEFAULT_AVAILABLE_APPS is empty, which might be intended
        # or might indicate an issue where it's defined/loaded.
        # This code assumes it *could* have data.
        if not DEFAULT_AVAILABLE_APPS:
             logger.warning("DEFAULT_AVAILABLE_APPS list is empty in crud.py. Cannot populate default apps.")
        else:
            logger.info(f"Initializing/Checking {len(DEFAULT_AVAILABLE_APPS)} default apps...")
            for app in DEFAULT_AVAILABLE_APPS:
                # Using ON CONFLICT DO NOTHING is simpler if updates aren't needed here
                await db.execute(
                    """
                    INSERT INTO available_apps(id, name, scope, module, url) VALUES($1, $2, $3, $4, $5)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    app.id, app.name, app.scope, app.module, app.url,
                    fetch_type="status"
                )
            logger.info("Default apps checked/inserted.")

        # --- Initialize Endpoints ---
        logger.info(f"Initializing/Checking default endpoints with URL: {DEFAULT_ENDPOINTS.jobConfigServiceUrl}")
        if DEFAULT_ENDPOINTS and DEFAULT_ENDPOINTS.jobConfigServiceUrl is not None:
            await db.execute(
                """
                INSERT INTO service_endpoints(id, job_config_service_url)
                VALUES('default', $1)
                ON CONFLICT (id) DO UPDATE SET
                    job_config_service_url = $2 -- Use $2 for the second placeholder
                """,
                # Provide the argument twice for the UPSERT statement
                DEFAULT_ENDPOINTS.jobConfigServiceUrl, DEFAULT_ENDPOINTS.jobConfigServiceUrl,
                fetch_type="status"
            )
            logger.info("Default endpoints checked/upserted.")
        else:
             logger.warning("DEFAULT_ENDPOINTS not configured correctly, skipping endpoint initialization.")

        logger.info("Default data initialization check/update completed successfully")
        return True # Indicate success
    except Exception as e:
         logger.error(f"Error during default data initialization: {e}", exc_info=True)
         return False # Indicate failure