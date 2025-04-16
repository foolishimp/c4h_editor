"""
Script to initialize the preferences database with default data.
This creates tables and populates them with default data from defaults.json.
"""

import asyncio
import logging
import json
import sys
from pathlib import Path

# Adjust the path to import from parent directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import db
from models.preferences import AppDefinition, ServiceEndpoints

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Path to SQL schema file
SCHEMA_FILE = Path(__file__).parent.parent / "database" / "schema.sql"

# Path to default data
DEFAULT_DATA_PATH = Path(__file__).parent.parent / "data" / "defaults.json"

async def read_schema_file() -> str:
    """Read the schema file content."""
    try:
        with open(SCHEMA_FILE, 'r') as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"Schema file not found at {SCHEMA_FILE}")
        raise

async def load_default_data():
    """Load default data from the JSON file."""
    try:
        with open(DEFAULT_DATA_PATH, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Default data file not found at {DEFAULT_DATA_PATH}")
        raise
    except json.JSONDecodeError:
        logger.error(f"Error decoding JSON from {DEFAULT_DATA_PATH}")
        raise

async def create_schema():
    """Create database schema."""
    try:
        schema_sql = await read_schema_file()
        logger.info("Creating database schema...")
        
        # Execute schema SQL
        await db.execute(schema_sql, fetch_type="status")
        logger.info("Schema created successfully")
        return True
    except Exception as e:
        logger.error(f"Error creating schema: {e}", exc_info=True)
        return False

async def populate_default_apps(available_apps):
    """Populate default available apps."""
    try:
        logger.info(f"Populating {len(available_apps)} default apps")
        
        for app_data in available_apps:
            app = AppDefinition(**app_data)
            
            # Check if app already exists
            existing = await db.execute(
                "SELECT id FROM available_apps WHERE id = $1",
                app.id,
                fetch_type="val"
            )
            
            if existing:
                logger.info(f"App {app.id} already exists, updating")
                await db.execute(
                    """
                    UPDATE available_apps
                    SET name = $2, scope = $3, module = $4, url = $5, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    """,
                    app.id, app.name, app.scope, app.module, app.url,
                    fetch_type="status"
                )
            else:
                logger.info(f"Adding new app {app.id}")
                await db.execute(
                    """
                    INSERT INTO available_apps(id, name, scope, module, url)
                    VALUES($1, $2, $3, $4, $5)
                    """,
                    app.id, app.name, app.scope, app.module, app.url,
                    fetch_type="status"
                )
                
        return True
    except Exception as e:
        logger.error(f"Error populating default apps: {e}", exc_info=True)
        return False

async def populate_default_endpoints(endpoints_data):
    """Populate default service endpoints."""
    try:
        logger.info("Setting up default service endpoints")
        endpoints = ServiceEndpoints(**endpoints_data)
        
        # Check if default endpoints exist
        existing = await db.execute(
            "SELECT id FROM service_endpoints WHERE id = 'default'",
            fetch_type="val"
        )
        
        if existing:
            logger.info("Default endpoints already exist, updating")
            await db.execute(
                """
                UPDATE service_endpoints
                SET job_config_service_url = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = 'default'
                """,
                endpoints.jobConfigServiceUrl,
                fetch_type="status"
            )
        else:
            logger.info("Adding default endpoints")
            await db.execute(
                """
                INSERT INTO service_endpoints(id, job_config_service_url)
                VALUES('default', $1)
                """,
                endpoints.jobConfigServiceUrl,
                fetch_type="status"
            )
                
        return True
    except Exception as e:
        logger.error(f"Error populating default endpoints: {e}", exc_info=True)
        return False

async def initialize_database():
    """Initialize the database with schema and default data."""
    try:
        # Connect to the database
        connected = await db.connect()
        if not connected:
            logger.error("Failed to connect to database. Exiting.")
            return False
        
        # Create schema
        if not await create_schema():
            return False
        
        # Load default data
        default_data = await load_default_data()
        
        # Populate default apps
        if not await populate_default_apps(default_data.get("availableApps", [])):
            return False
        
        # Populate default endpoints
        if not await populate_default_endpoints(default_data.get("defaultEndpoints", {})):
            return False
        
        logger.info("Database initialization completed successfully")
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        return False
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(initialize_database())