# File: backend/main.py
"""
Main application entry point for the C4H Backend.
Sets up FastAPI, routes, and middleware.
Focused on configuration management and C4H service access.
"""

import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from contextlib import asynccontextmanager

# Import only the routes we need - removing legacy routes
from backend.api.routes.configs import router as configs_router
from backend.api.routes.jobs import router as jobs_router
from backend.services.config_repository import ConfigRepository
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService
from backend.config import load_config
from backend.config.config_types import load_config_types, get_config_types
from backend.dependencies import get_job_repository, get_c4h_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load configuration
config_path = os.environ.get("CONFIG_PATH", "./config.yaml")
config = load_config(config_path)

# Load configuration types
config_types = load_config_types()

# Lifespan context manager for setup and cleanup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize services
    logger.info("Application starting up")
    
    # Initialize repos for all registered config types
    for config_type in config_types.keys():
        repo_path = config_types[config_type].get("repository", {}).get("path")
        if repo_path:
            path = Path(repo_path)
            path.parent.mkdir(exist_ok=True)
            ConfigRepository(config_type, str(path))
            logger.info(f"Initialized repository for {config_type}")
    
    # Make sure other dependencies are initialized
    get_job_repository()
    
    c4h_service = get_c4h_service()
    
    yield
    
    # Shutdown: clean up resources
    logger.info("Application shutting down")
    
    # Close C4H service client
    await c4h_service.close()

# Create FastAPI app with lifespan
app = FastAPI(
    title="C4H Editor API",
    description="API for managing configurations with version control",
    version="0.2.0",
    lifespan=lifespan
)

# Add CORS middleware with configuration from config
origins = config.get("api", {}).get("cors_origins", ["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - only using the new generic ones
app.include_router(configs_router)
app.include_router(jobs_router)

# Add health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for the API."""
    # Get all available config types
    available_config_types = list(get_config_types().keys())
    
    return {
        "status": "healthy",
        "version": "0.2.0",
        "config_loaded": bool(config),
        "services": {
            "repository": True,
            "jobs": True,
            "c4h": True
        },
        "supported_config_types": available_config_types
    }

@app.get("/api/v1/config-types")
async def get_config_types_endpoint():
    """Get all registered configuration types."""
    config_types_info = get_config_types()
    
    # Format for API response
    result = []
    for key, info in config_types_info.items():
        result.append({
            "type": key,
            "name": info.get("name", key),
            "description": info.get("description", ""),
            "supportsVersioning": info.get("supportsVersioning", True)
        })
        
    return result

if __name__ == "__main__":
    import uvicorn
    
    # Get host and port from environment or config
    host = os.environ.get("HOST", config.get("api", {}).get("host", "0.0.0.0"))
    port = int(os.environ.get("PORT", config.get("api", {}).get("port", 8000)))
    
    # Start server
    uvicorn.run(app, host=host, port=port)