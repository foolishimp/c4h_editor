"""
CRUD operations for the Preferences Shell Service.
"""

import logging
from typing import List, Optional, Dict, Any
import json # Import json module
from pathlib import Path
import uuid

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
DEFAULT_ENDPOINTS = ServiceEndpoints(jobConfigServiceUrl="http://localhost:8000")

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

            if not rows:
                logger.info(f"No frames found for user {user_id}, using defaults (empty list)")
                return [] # Return empty list explicitly

            frames = []
            for row in rows:
                try:
                    # Deserialize assigned_apps from TEXT column
                    assigned_apps_list = json.loads(row['assigned_apps']) if row['assigned_apps'] else []
                except json.JSONDecodeError:
                    logger.warning(f"Could not decode assigned_apps JSON for frame {row['id']}. Content: {row['assigned_apps']}")
                    assigned_apps_list = []
                except TypeError: # Handle case where row might not be subscriptable
                    logger.warning(f"Unexpected row format for frame data: {row}")
                    assigned_apps_list = []

                # Construct Frame only if row data is valid
                if 'id' in row and 'name' in row and 'order' in row:
                     frame = Frame(
                         id=row['id'], name=row['name'],
                         order=row['order'],
                         assignedApps=[AppAssignment(**app) for app in assigned_apps_list]
                     )
                     frames.append(frame)
                else:
                     logger.warning(f"Skipping invalid row data during frame construction: {row}")


            return frames
        else:
            logger.warning(f"Database unavailable in get_user_frames. Returning default frames for user {user_id}")
            return DEFAULT_FRAMES
    except Exception as e:
        logger.error(f"Error fetching frames for user {user_id}: {e}", exc_info=True)
        return DEFAULT_FRAMES # Return default on error

async def save_user_frames(user_id: str, frames: List[Frame]) -> bool:
    """Save frames for a user, overwriting existing ones."""
    try:
        # Check health before proceeding
        if not await db.check_health():
            logger.warning(f"Database unavailable. Cannot save frames for user {user_id}")
            return False

        # --- Removed incompatible `async with conn.transaction():` block ---

        # Delete existing frames for this user
        # db.execute handles connection and commit for SQLite status type
        await db.execute("DELETE FROM frames WHERE user_id = $1", user_id, fetch_type="status")

        # Insert new frames
        for frame in frames:
            # Serialize assignedApps to JSON string for TEXT column
            assigned_apps_json = json.dumps([app.model_dump() for app in frame.assignedApps])
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
                 fetch_type="all" # Explicitly add fetch_type
            )
            logger.info(f"[SERVICE CRUD] Raw rows fetched from available_apps: {rows}")

            if not rows:
                logger.info("No apps found in database, returning default (empty list)")
                return [] # Return empty list explicitly

            apps = []
            for row in rows:
                 # Construct AppDefinition only if row data is valid
                 if 'id' in row and 'name' in row and 'scope' in row and 'module' in row:
                     app = AppDefinition(
                         id=row['id'],
                         name=row['name'],
                         scope=row['scope'],
                         module=row['module'],
                         url=row.get('url') # Use .get for optional url
                     )
                     apps.append(app)
                 else:
                     logger.warning(f"Skipping invalid row data during app definition construction: {row}")

            return apps
        else:
            logger.warning("Database unavailable in get_available_apps. Returning default apps")
            return DEFAULT_AVAILABLE_APPS
    except Exception as e:
        logger.error(f"Error fetching available apps: {e}", exc_info=True)
        return DEFAULT_AVAILABLE_APPS

async def get_service_endpoints() -> ServiceEndpoints:
    """Retrieve service endpoint configuration."""
    try:
        is_healthy = await db.check_health()
        if is_healthy:
            row = await db.execute(
                """
                SELECT job_config_service_url
                FROM service_endpoints
                WHERE id = 'default'
                """,
                fetch_type="one"
            )

            if not row:
                logger.info("No service endpoints found in database, using defaults")
                return DEFAULT_ENDPOINTS

            # Check if column exists in row before accessing
            job_url = row['job_config_service_url'] if 'job_config_service_url' in row else None
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
    try:
        # Check health first
        if not await db.check_health():
            logger.warning("Database unavailable during initialize_default_data. Cannot initialize.")
            return # Can't proceed

        # Load default apps
        for app in DEFAULT_AVAILABLE_APPS: # Assumes DEFAULT_AVAILABLE_APPS is populated correctly
            await db.execute(
                """
                INSERT INTO available_apps(id, name, scope, module, url) VALUES($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO NOTHING
                """,
                app.id, app.name, app.scope, app.module, app.url,
                fetch_type="status"
            )

        # Load default endpoints
        # Ensure DEFAULT_ENDPOINTS is correctly initialized
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
        else:
             logger.warning("DEFAULT_ENDPOINTS not configured correctly, skipping endpoint initialization.")


        logger.info("Default data initialization check/update completed successfully")
        return True # Indicate success
    except Exception as e:
         logger.error(f"Error during default data initialization: {e}", exc_info=True)
         return False # Indicate failure