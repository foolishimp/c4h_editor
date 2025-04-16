"""
Main FastAPI application for the Preferences Shell Service.
"""

import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Assuming routes are in ./api/routes/
from shell_service.api.routes import shell as shell_router
from shell_service.database import db  # <-- Corrected
from shell_service.database import crud # <-- Corrected

# Configure basic logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Lifespan Management for DB Setup/Teardown ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Preferences Shell Service starting up...")
    # Connect to database
    connected = await db.connect() # Check connection result
    logger.info(f"Database connection attempt during startup successful: {connected}") # Log result

    # Initialize default data
    await crud.initialize_default_data()
    yield
    # Disconnect from database
    await db.disconnect()

app = FastAPI(
    title="C4H Preferences Shell Service",
    description="Backend-for-Frontend (BFF) serving UI configuration and preferences for the C4H Editor Shell.",
    version="0.1.0"
)

# --- Middleware --- 

# TODO: Configure CORS properly based on deployment needs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Routers ---
app.include_router(shell_router.router)

@app.get("/health", tags=["health"])
async def health_check():
    # Enhanced health check that includes DB status
    db_status = await db.check_health()
    return {
        "status": "healthy" if db_status else "degraded",
        "service": "Preferences Shell Service",
        "database": db_status
    }