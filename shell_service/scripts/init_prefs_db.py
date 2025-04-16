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
# Ensure this path adjustment works correctly for your project structure
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Add try-except for imports to provide clearer error messages if modules are missing
try:
    from database import db
    from models.preferences import AppDefinition, ServiceEndpoints # type: ignore
except ImportError as e:
    print(f"Error importing modules: {e}. Make sure you are running from the correct directory and the virtual environment is active.", file=sys.stderr)
    sys.exit(1)


# Configure logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Path to SQL schema file
SCHEMA_FILE = Path(__file__).parent.parent / "database" / "schema.sql"

# Path to default data
DEFAULT_DATA_PATH = Path(__file__).parent.parent / "data" / "defaults.json"

async def read_schema_file() -> str:
    """Read the schema file content."""
    if not SCHEMA_FILE.is_file():
        logger.error(f"Schema file not found at {SCHEMA_FILE}")
        raise FileNotFoundError(f"Schema file not found: {SCHEMA_FILE}")
    try:
        with open(SCHEMA_FILE, 'r') as f:
            return f.read()
    except Exception as e:
        logger.error(f"Error reading schema file {SCHEMA_FILE}: {e}", exc_info=True)
        raise

async def load_default_data():
    """Load default data from the JSON file."""
    if not DEFAULT_DATA_PATH.is_file():
         logger.warning(f"Default data file not found at {DEFAULT_DATA_PATH}, proceeding without defaults.")
         # Return a default structure if file not found, to prevent downstream errors
         return {"availableApps": [], "defaultEndpoints": {}}
    try:
        with open(DEFAULT_DATA_PATH, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from {DEFAULT_DATA_PATH}: {e}")
        raise
    except Exception as e:
         logger.error(f"Error reading default data file {DEFAULT_DATA_PATH}: {e}", exc_info=True)
         raise


# --- Updated create_schema function to use executescript ---
async def create_schema():
    """Create database schema using executescript for multi-statement SQL."""
    try:
        schema_sql = await read_schema_file()
        logger.info(f"Executing schema script from {SCHEMA_FILE}...")

        async with db.get_connection() as conn:
            # Use executescript for SQLite to handle multiple statements
            if db.DB_TYPE == "sqlite":
                 await conn.executescript(schema_sql)
                 logger.info("SQLite schema script executed successfully.")
            else:
                 # For PostgreSQL, execute as a single block (asyncpg handles it)
                 # Or split and execute if necessary, but try single block first
                 await db.execute(schema_sql, fetch_type="status")
                 logger.info("PostgreSQL schema script executed successfully.")
        return True
    except FileNotFoundError:
         # Error already logged in read_schema_file
         return False
    except Exception as e:
        # Log the specific SQL that might have caused the issue if available
        logger.error(f"Error executing schema script: {e}", exc_info=True)
        return False
# --- End of updated create_schema function ---


async def populate_default_apps(available_apps):
    """Populate default available apps."""
    # (Keep existing logic - relies on db.execute)
    # ... (rest of the function remains the same) ...
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
    # (Keep existing logic - relies on db.execute)
    # ... (rest of the function remains the same) ...
    try:
        logger.info("Setting up default service endpoints")
        # Handle case where endpoints_data might be None or missing keys
        if not endpoints_data or 'jobConfigServiceUrl' not in endpoints_data:
             logger.warning("No default endpoint data found in defaults.json, skipping population.")
             return True # Not an error, just nothing to populate

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
    # (Keep existing logic - calls updated create_schema)
    # ... (rest of the function remains the same) ...
    try:
        # Connect to the database
        logger.info("Connecting to database...")
        connected = await db.connect()
        if not connected:
            logger.error("Failed to connect to database. Exiting.")
            return False

        # Create schema
        if not await create_schema():
             logger.error("Schema creation failed. Exiting.")
             # Attempt to disconnect even if schema fails
             await db.disconnect()
             return False

        # Load default data
        logger.info("Loading default data...")
        default_data = await load_default_data()

        # Populate default apps
        logger.info("Populating default apps...")
        if not await populate_default_apps(default_data.get("availableApps", [])):
            logger.error("Failed to populate default apps.")
            # Decide if this is a critical failure or just a warning
            # For now, let's continue to endpoints but report failure
            pass # Continue, but logged as error

        # Populate default endpoints
        logger.info("Populating default endpoints...")
        if not await populate_default_endpoints(default_data.get("defaultEndpoints", {})):
             logger.error("Failed to populate default endpoints.")
             # Decide if this is critical
             pass # Continue, but logged as error


        logger.info("Database initialization completed successfully")
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        return False
    finally:
        # Ensure disconnection happens even on errors after successful connect
        logger.info("Disconnecting from database...")
        await db.disconnect()


if __name__ == "__main__":
    # Ensure the event loop is managed correctly
    try:
        asyncio.run(initialize_database())
    except KeyboardInterrupt:
        logger.info("Initialization interrupted by user.")
    except Exception as main_error:
         logger.critical(f"An unexpected error occurred during initialization: {main_error}", exc_info=True)