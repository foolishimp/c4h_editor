"""
Middleware for logging HTTP requests and responses.
Provides comprehensive tracking of API calls for debugging and auditing.
"""

import logging
import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import json

# Configure logger
logger = logging.getLogger("api.requests")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all incoming HTTP requests and their responses.
    Includes correlation IDs to track request-response pairs.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate correlation ID
        correlation_id = str(uuid.uuid4())
        
        # Start timer
        start_time = time.time()
        
        # Extract request details
        client_host = request.client.host if request.client else "unknown"
        method = request.method
        url = str(request.url)
        
        # Extract headers (sanitizing sensitive ones)
        headers = dict(request.headers)
        if "authorization" in headers:
            headers["authorization"] = "[REDACTED]"
        if "cookie" in headers:
            headers["cookie"] = "[REDACTED]"
        
        # Log request
        log_data = {
            "correlation_id": correlation_id,
            "request": {
                "method": method,
                "url": url,
                "client_ip": client_host,
                "headers": headers,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
        }
        
        # Try to get query params
        query_params = dict(request.query_params)
        log_data["request"]["query_params"] = query_params
        
        # Log the request
        logger.info(f"API Request: {json.dumps(log_data)}")
        
        # Set correlation ID in request state
        request.state.correlation_id = correlation_id
        
        # Process the request
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log response
            response_log = {
                "correlation_id": correlation_id,
                "response": {
                    "status_code": response.status_code,
                    "duration_ms": round(duration * 1000, 2),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            }
            
            log_level = logging.INFO
            if response.status_code >= 400:
                log_level = logging.ERROR
                
            logger.log(log_level, f"API Response: {json.dumps(response_log)}")
            
            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id
            
            return response
            
        except Exception as e:
            # Calculate duration
            duration = time.time() - start_time
            
            # Log the error
            error_log = {
                "correlation_id": correlation_id,
                "error": {
                    "type": type(e).__name__,
                    "message": str(e),
                    "duration_ms": round(duration * 1000, 2),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            }
            
            logger.error(f"API Error: {json.dumps(error_log)}")
            
            # Re-raise to let it be handled by FastAPI's exception handlers
            raise

class APIErrorLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that catches and logs all exceptions in API handlers.
    Ensures consistent error logging across all endpoints.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except Exception as e:
            # Get correlation ID if available
            correlation_id = getattr(request.state, "correlation_id", "unknown")
            
            # Log the error
            error_log = {
                "correlation_id": correlation_id,
                "error": {
                    "type": type(e).__name__,
                    "message": str(e),
                    "path": str(request.url.path),
                    "method": request.method,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            }
            
            logger.error(f"Unhandled API Error: {json.dumps(error_log)}")
            
            # Re-raise for FastAPI's exception handlers
            raise