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
    from models.preferences import AppDefinition, ServiceEndpoints # type: ignore # Add type ignore if imports show issues
except ImportError as e:
    print(f"Error importing modules: {e}. Make sure you are running from the correct directory and the virtual environment is active.", file=sys.stderr)
    sys.exit(1)


# Configure logger
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
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
            logger.info(f"Loading default data from: {DEFAULT_DATA_PATH}")
            return json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from {DEFAULT_DATA_PATH}: {e}")
        raise
    except Exception as e:
         logger.error(f"Error reading default data file {DEFAULT_DATA_PATH}: {e}", exc_info=True)
         raise


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
                 await db.execute(schema_sql, fetch_type="status")
                 logger.info("PostgreSQL schema script executed successfully.")
        return True
    except FileNotFoundError:
         return False
    except Exception as e:
        logger.error(f"Error executing schema script: {e}", exc_info=True)
        return False


async def populate_default_apps(available_apps):
    """Populate default available apps."""
    try:
        if not available_apps:
             logger.warning("No available apps data provided to populate_default_apps.")
             return True # Not an error, just nothing to do

        logger.info(f"Populating/Checking {len(available_apps)} default apps...")

        for app_data in available_apps:
            try:
                # Create AppDefinition from defaults.json data
                app = AppDefinition(**app_data)
                logger.debug(f"Processing app data: {app_data}, Parsed AppDefinition URL: {app.url}") # Log parsed URL

                # Check if app already exists
                existing = await db.execute(
                    "SELECT id FROM available_apps WHERE id = $1",
                    app.id,
                    fetch_type="val"
                )

                # --- ADDED LOGGING BEFORE DB EXECUTE ---
                log_payload = f"id={app.id}, name={app.name}, scope={app.scope}, module={app.module}, url={app.url}"
                if existing:
                    logger.info(f"App {app.id} already exists, attempting UPDATE with: {log_payload}")
                    await db.execute(
                        """
                        UPDATE available_apps
                        SET name = $2, scope = $3, module = $4, url = $5, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                        """,
                        app.id, app.name, app.scope, app.module, app.url, # Pass app.url
                        fetch_type="status"
                    )
                else:
                    logger.info(f"Adding new app {app.id} with: {log_payload}")
                    await db.execute(
                        """
                        INSERT INTO available_apps(id, name, scope, module, url)
                        VALUES($1, $2, $3, $4, $5)
                        """,
                        app.id, app.name, app.scope, app.module, app.url, # Pass app.url
                        fetch_type="status"
                    )
                # --- END ADDED LOGGING ---
            except Exception as app_error:
                 logger.error(f"Failed to process app data: {app_data}. Error: {app_error}", exc_info=True)
                 # Decide whether to continue or fail script on single app error
                 # return False # Option: Fail entire script
                 continue # Option: Skip failed app and continue

        return True
    except Exception as e:
        logger.error(f"Error populating default apps: {e}", exc_info=True)
        return False


async def populate_default_endpoints(endpoints_data):
    """Populate default service endpoints."""
    try:
        logger.info("Populating/Checking default service endpoints...")
        if not endpoints_data or 'jobConfigServiceUrl' not in endpoints_data:
             logger.warning("No default endpoint data found in defaults.json, skipping population.")
             return True

        endpoints = ServiceEndpoints(**endpoints_data)
        url_to_save = endpoints.jobConfigServiceUrl

        logger.debug(f"Endpoint URL to save: {url_to_save}") # Log URL being saved

        # Check if default endpoints exist
        existing = await db.execute(
            "SELECT id FROM service_endpoints WHERE id = 'default'",
            fetch_type="val"
        )

        if existing:
            logger.info("Default endpoints already exist, attempting UPDATE.")
            await db.execute(
                """
                UPDATE service_endpoints
                SET job_config_service_url = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = 'default'
                """,
                url_to_save,
                fetch_type="status"
            )
        else:
            logger.info("Adding default endpoints.")
            await db.execute(
                """
                INSERT INTO service_endpoints(id, job_config_service_url)
                VALUES('default', $1)
                """,
                url_to_save,
                fetch_type="status"
            )

        return True
    except Exception as e:
        logger.error(f"Error populating default endpoints: {e}", exc_info=True)
        return False


async def initialize_database():
    """Initialize the database with schema and default data."""
    try:
        logger.info("Connecting to database...")
        connected = await db.connect()
        if not connected:
            logger.error("Failed to connect to database. Exiting.")
            return False

        if not await create_schema():
             logger.error("Schema creation failed. Exiting.")
             await db.disconnect()
             return False

        logger.info("Loading default data...")
        default_data = await load_default_data()

        apps_ok = await populate_default_apps(default_data.get("availableApps", []))
        endpoints_ok = await populate_default_endpoints(default_data.get("defaultEndpoints", {}))

        # Check if population steps succeeded
        if not apps_ok or not endpoints_ok:
             logger.error("One or more default data population steps failed.")
             await db.disconnect()
             return False


        logger.info("Database initialization completed successfully")
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        return False
    finally:
        logger.info("Disconnecting from database...")
        await db.disconnect()

if __name__ == "__main__":
    try:
        # Set higher log level for asyncio/libs if needed for debugging startup
        # logging.getLogger('asyncio').setLevel(logging.WARNING)
        # logging.getLogger('aiosqlite').setLevel(logging.WARNING)
        success = asyncio.run(initialize_database())
        if not success:
             sys.exit(1) # Exit with error code if init failed
    except KeyboardInterrupt:
        logger.info("Initialization interrupted by user.")
    except Exception as main_error:
         logger.critical(f"An unexpected error occurred during initialization: {main_error}", exc_info=True)
         sys.exit(1) # Exit with error code