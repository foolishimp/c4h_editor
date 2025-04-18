"""
Main application entry point for the C4H Backend.
Sets up FastAPI, routes, and middleware.
Focused on configuration management and C4H service access.
"""

import logging
import json
import sys
import structlog # Import structlog
from structlog import get_logger
import os
import time
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import http_exception_handler, request_validation_exception_handler
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from contextlib import asynccontextmanager

# Import only the routes needed for generic config API
from backend.api.routes.configs import router as configs_router
from backend.api.routes.jobs import router as jobs_router
from backend.services.config_repository import ConfigRepository
from backend.services.job_repository import JobRepository
from backend.services.c4h_service import C4HService
from backend.config import load_config
from backend.config.config_types import load_config_types, get_config_types
from backend.api.middleware import RequestLoggingMiddleware, APIErrorLoggingMiddleware
from backend.dependencies import get_job_repository, get_c4h_service # Keep this if dependencies.py is used for repo/service instances

# --- Explicit Structlog Configuration ---
# Configure standard logging first (level set by uvicorn --log-level flag takes precedence here if basicConfig isn't called first,
# but structlog needs this base handler setup). We won't set the level here.
logging.basicConfig(
    format="%(message)s", # structlog will handle the final formatting
    stream=sys.stdout,
    level=logging.DEBUG # Set the underlying handler level low enough
)

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level, # Filter based on standard logging levels
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger, # Use standard logger wrapper
    cache_logger_on_first_use=True,
)

# Now, get the logger using the configured structlog
logger = get_logger(__name__)

# Create API request logger
# Note: JsonFormatter might conflict slightly with structlog's output,
# but we'll keep it for now for the specific api.requests logger.
# Consider switching to structlog's JSONRenderer later if needed.
api_logger = logging.getLogger("api.requests")
# Let the root level control this logger too, or set explicitly if needed:
# api_logger.setLevel(logging.DEBUG)

# Configure a formatter for structured logging
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, "%Y-%m-%d %H:%M:%S"),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage()
        }

        # Add exception info if available
        if record.exc_info:
            log_record["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1])
            }

        return json.dumps(log_record)

# Add handler with the JSON formatter to the API logger
api_handler = logging.StreamHandler()
api_handler.setFormatter(JsonFormatter())
api_logger.addHandler(api_handler)

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

# Add request and error logging middleware
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(APIErrorLoggingMiddleware)

# Add global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Get correlation ID if available
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    
    # Log the validation error
    error_details = exc.errors()
    
    error_log = {
        "correlation_id": correlation_id,
        "error": {
            "type": "RequestValidationError",
            "details": error_details,
            "path": str(request.url.path),
            "method": request.method,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    }
    
    api_logger.error(f"Validation Error: {json.dumps(error_log)}")
    
    # Return the standard FastAPI validation error response
    return await request_validation_exception_handler(request, exc)

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Get correlation ID if available
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    
    # Log the HTTP exception
    error_log = {
        "correlation_id": correlation_id,
        "error": {
            "type": "HTTPException",
            "status_code": exc.status_code,
            "detail": exc.detail,
            "path": str(request.url.path),
            "method": request.method,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    }
    
    log_level = logging.ERROR if exc.status_code >= 500 else logging.WARNING
    api_logger.log(log_level, f"HTTP Exception: {json.dumps(error_log)}")
    
    # Call the original HTTP exception handler
    return await http_exception_handler(request, exc)

# Include routers - only using the generic ones
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
            "c4h": True,
            "multi_config_support": True
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