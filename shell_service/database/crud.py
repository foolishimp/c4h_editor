"""
CRUD operations for the Preferences Shell Service.
Replace stubs with actual database interactions (e.g., using SQLAlchemy, asyncpg, or an ORM).
"""

import logging
from typing import List, Optional, Dict, Any
import json
from pathlib import Path
import uuid

from . import db # Note the leading dot '.'
from shell_service.models.preferences import Frame, AppDefinition, ServiceEndpoints, AppAssignment

logger = logging.getLogger(__name__)

# Default values for when database is unavailable
DEFAULT_FRAMES = []
DEFAULT_AVAILABLE_APPS = []
DEFAULT_ENDPOINTS = ServiceEndpoints(jobConfigServiceUrl="http://localhost:8000")

async def get_user_frames(user_id: str) -> List[Frame]:
    """Stub: Retrieve frames for a user."""
    try:
        # Check if we have database connection
        if await db.check_health():
            # Get frames from database
            rows = await db.execute(
                """
                SELECT id, name, "order", assigned_apps
                FROM frames
                WHERE user_id = $1
                ORDER BY "order"
                """,
                user_id
            )
            
            if not rows:
                logger.info(f"No frames found for user {user_id}, using defaults")
                return DEFAULT_FRAMES
            
            frames = []
            for row in rows:
                # Convert row dict to Frame model
                frame = Frame(
                    id=row['id'],
                    name=row['name'],
                    order=row['order'],
                    assignedApps=[AppAssignment(**app) for app in row['assigned_apps']]
                )
                frames.append(frame)
            
            return frames
        else:
            logger.warning(f"Database unavailable. Returning default frames for user {user_id}")
            return DEFAULT_FRAMES
    except Exception as e:
        logger.error(f"Error fetching frames for user {user_id}: {e}", exc_info=True)
        return DEFAULT_FRAMES

async def save_user_frames(user_id: str, frames: List[Frame]) -> bool:
    """Stub: Save frames for a user."""
    if not await db.check_health():
        logger.warning(f"Database unavailable. Cannot save frames for user {user_id}")
        return False
    
    try:
        async with db.get_connection() as conn:
            # Start a transaction
            async with conn.transaction():
                # Delete existing frames for this user
                await conn.execute(
                    "DELETE FROM frames WHERE user_id = $1",
                    user_id
                )
                
                # Insert new frames
                for frame in frames:
                    await conn.execute(
                        """
                        INSERT INTO frames(id, user_id, name, "order", assigned_apps)
                        VALUES($1, $2, $3, $4, $5)
                        """,
                        frame.id or str(uuid.uuid4()),
                        user_id,
                        frame.name,
                        frame.order,
                        [app.model_dump() for app in frame.assignedApps]
                    )
                
                logger.info(f"Successfully saved {len(frames)} frames for user {user_id}")
                return True
    except Exception as e:
        logger.error(f"Error saving frames for user {user_id}: {e}", exc_info=True)
        return False

async def get_available_apps() -> List[AppDefinition]:
    """Stub: Retrieve list of available apps."""
    try:
        if await db.check_health():
            rows = await db.execute(
                """
                SELECT id, name, scope, module, url
                FROM available_apps
                ORDER BY name
                """
            )
            
            if not rows:
                logger.info("No apps found in database, using defaults")
                return DEFAULT_AVAILABLE_APPS
            
            apps = []
            for row in rows:
                app = AppDefinition(
                    id=row['id'],
                    name=row['name'],
                    scope=row['scope'],
                    module=row['module'],
                    url=row['url']
                )
                apps.append(app)
            
            return apps
        else:
            logger.warning("Database unavailable. Returning default apps")
            return DEFAULT_AVAILABLE_APPS
    except Exception as e:
        logger.error(f"Error fetching available apps: {e}", exc_info=True)
        return DEFAULT_AVAILABLE_APPS

async def get_service_endpoints() -> ServiceEndpoints:
    """Stub: Retrieve service endpoint configuration."""
    try:
        if await db.check_health():
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
            
            return ServiceEndpoints(
                jobConfigServiceUrl=row['job_config_service_url']
            )
        else:
            logger.warning("Database unavailable. Returning default endpoints")
            return DEFAULT_ENDPOINTS
    except Exception as e:
        logger.error(f"Error fetching service endpoints: {e}", exc_info=True)
        return DEFAULT_ENDPOINTS

# Additional helper function to initialize the database with default values
async def initialize_default_data():
    """Initialize database with default apps and endpoints if they don't exist."""
    if not await db.check_health():
        logger.warning("Database unavailable. Cannot initialize default data.")
        return False
    
    # Load default apps
    for app in DEFAULT_AVAILABLE_APPS:
        await db.execute(
            """
            INSERT INTO available_apps(id, name, scope, module, url)
            VALUES($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING
            """,
            app.id, app.name, app.scope, app.module, app.url,
            fetch_type="status"
        )
    
    # Load default endpoints
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
    
    logger.info("Default data initialized successfully")
    return True