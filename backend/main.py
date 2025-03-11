"""
Main application entry point for the Prompt Editor Backend.
Sets up FastAPI, routes, and middleware.
"""

import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from contextlib import asynccontextmanager

from backend.api.routes.workorders import router as workorders_router
from backend.api.routes.jobs import router as jobs_router
from backend.services.workorder_repository import WorkOrderRepository
from backend.services.lineage_tracker import LineageTracker
from backend.services.llm_service import LLMService
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService
from backend.config import load_config
from backend.dependencies import get_workorder_repository, get_lineage_tracker, get_llm_service, get_job_repository, get_c4h_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load configuration
config_path = os.environ.get("CONFIG_PATH", "./config.yaml")
config = load_config(config_path)

# Lifespan context manager for setup and cleanup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize services
    logger.info("Application starting up")
    
    # Make sure dependencies are initialized
    get_workorder_repository()
    get_lineage_tracker()
    get_job_repository()
    
    llm_service = get_llm_service()
    c4h_service = get_c4h_service()
    
    yield
    
    # Shutdown: clean up resources
    logger.info("Application shutting down")
    
    # Close LLM service client
    await llm_service.close()
    await c4h_service.close()

# Create FastAPI app with lifespan
app = FastAPI(
    title="Prompt Editor API",
    description="API for managing prompt templates with version control",
    version="0.1.0",
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

# Initialize repository directory from config
repo_path = Path(config.get("repository", {}).get("path", "./data/workorder_repository"))
repo_path.parent.mkdir(exist_ok=True)

# Include routers - fix to use the imported router directly
app.include_router(workorders_router)
app.include_router(jobs_router)

# Add health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for the API."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "config_loaded": bool(config),
        "services": {
            "repository": True,
            "lineage": True,
            "llm": True,
            "jobs": True,
            "c4h": True
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    # Get host and port from environment or config
    host = os.environ.get("HOST", config.get("api", {}).get("host", "0.0.0.0"))
    port = int(os.environ.get("PORT", config.get("api", {}).get("port", 8000)))
    
    # Start server
    uvicorn.run(app, host=host, port=port)