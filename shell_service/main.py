"""
Main FastAPI application for the Preferences Shell Service.
"""

import logging
import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request # Import Request
from fastapi.middleware.cors import CORSMiddleware

# Assuming routes are in ./api/routes/
from shell_service.api.routes import shell as shell_router
from shell_service.database import db
# Import functions and CURRENT_ENV, but not the config dict itself
from shell_service.config import CURRENT_ENV, load_environment_config, load_layout_templates
from shell_service.database import crud

# --- Configure basic logging ---
# Configure logging level and format
logging.basicConfig(
    level=logging.DEBUG, # Set to DEBUG to see more details during startup/requests
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
# Optionally set higher levels for noisy libraries
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("aiosqlite").setLevel(logging.INFO) # Or WARNING

logger = logging.getLogger(__name__) # Get logger for this module

# --- Lifespan Management ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles application startup and shutdown events."""
    logger.info("Shell Service starting up...")
    logger.info(f"Running in environment: {CURRENT_ENV}")

    # --- Load Configurations and Store in App State ---
    # Load environment config DURING startup lifespan
    app.state.environment_config = load_environment_config()
    logger.info(f"Environment config loaded for '{CURRENT_ENV}'.")

    # Load layout templates DURING startup lifespan
    app.state.layout_templates = load_layout_templates()
    logger.info(f"Loaded {len(app.state.layout_templates)} layout templates.")
    # --- End Configuration Loading ---

    # Connect to database
    connected = await db.connect()
    logger.info(f"Database connection attempt successful: {connected}")

    # Initialize default data (optional, check if needed after schema creation)
    if connected:
        init_ok = await crud.initialize_default_data()
        logger.info(f"Default data initialization attempt status: {init_ok}")
    else:
        logger.error("Skipping default data initialization due to DB connection failure.")

    yield # Application runs here

    # --- Shutdown ---
    logger.info("Shell Service shutting down...")
    # Disconnect from database
    await db.disconnect()
    logger.info("Database disconnected.")

# Create FastAPI app instance with lifespan manager
app = FastAPI(
    title="C4H Preferences Shell Service",
    description="Backend-for-Frontend (BFF) serving UI configuration and preferences for the C4H Editor Shell.",
    version="0.1.0",
    lifespan=lifespan # Register the lifespan context manager
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Routers ---
app.include_router(shell_router.router)

# --- Root/Health Endpoint ---
@app.get("/health", tags=["health"])
async def health_check(request: Request): # Added request: Request
    """Enhanced health check including DB status and config load status."""
    db_status = await db.check_health()
    # Check if essential state was loaded
    env_config_loaded = hasattr(request.app.state, 'environment_config') and request.app.state.environment_config is not None
    layouts_loaded = hasattr(request.app.state, 'layout_templates') # Check if attribute exists

    overall_status = "healthy"
    if not db_status or not env_config_loaded:
        overall_status = "degraded"

    return {
        "status": overall_status,
        "service": "Preferences Shell Service",
        "database_connected": db_status,
        "env_config_loaded": env_config_loaded,
        "layouts_found": len(getattr(request.app.state, 'layout_templates', {})) if layouts_loaded else "check_startup_logs"
    }