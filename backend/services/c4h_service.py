"""Service client for interacting with the C4H API with support for multiple configurations."""

import os
import json
import logging
import time
from typing import Dict, List, Optional, Any
from datetime import datetime
import httpx
from pydantic import BaseModel

from backend.models.job import Job, JobStatus, JobResult
from backend.models.configuration import Configuration
from backend.config import load_config

logger = logging.getLogger(__name__)


class JobSubmissionResponse(BaseModel):
    """Response from job submission."""
    job_id: str
    status: str
    message: Optional[str] = None


class JobStatusResponse(BaseModel):
    """Response from job status check."""
    job_id: str
    status: str
    progress: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class C4HService:
    """Client for the C4H service API."""
    
    def __init__(self, config_path: Optional[str] = None):
        """Initialize the C4H service client."""
        self.config = load_config(config_path)
        self.c4h_config = self.config.get("c4h_service", {}) 
        
        # API configuration - build from host and port if provided
        host = self.c4h_config.get("host", "localhost")
        port = self.c4h_config.get("port", 5500)
        self.api_base = self.c4h_config.get("api_base", f"http://{host}:{port}")
        self.api_version = self.c4h_config.get("api_version", "v1")
        
        # Default job configuration
        self.default_job_config = self.c4h_config.get("job_config", {
            "max_runtime": 3600,
            "notify_on_completion": True
        })
        
        # API key from environment
        self.api_key_env = self.c4h_config.get("api_key_env", "C4H_API_KEY")
        self.api_key = os.environ.get(self.api_key_env)
        
        if not self.api_key:
            logger.warning(f"C4H API key not found in environment variable {self.api_key_env}")
        
        # Initialize HTTP client
        self.http_client = httpx.AsyncClient(timeout=60.0)
        
        logger.info(f"C4H service client initialized with API base: {self.api_base}")
    
    async def submit_job(self, workorder: Configuration = None, team: Configuration = None, runtime: Configuration = None) -> JobSubmissionResponse:
        """
        Submit a job with multiple configurations to the C4H service.
        
        Args:
            workorder: Workorder configuration object
            team: Team configuration object
            runtime: Runtime configuration object

        Returns:
            Job submission response

        Raises:
            ValueError: If required configurations are missing or C4H API key is not found
        """
        if not self.api_key:
            raise ValueError(f"C4H API key not found in environment variable {self.api_key_env}")
        
        if not workorder:
            raise ValueError("Workorder configuration is required")
        if not team:
            raise ValueError("Team configuration is required")
        if not runtime:
            raise ValueError("Runtime configuration is required")
        
        def serialize_config(config):
            if hasattr(config.content, "dict"):
                return config.content.dict()
            return config.content
        
        payload["workorder"] = {
            "id": workorder.id, 
            "content": serialize_config(workorder)
        }
        
        payload = {}
        payload["workorder"] = {
            "id": workorder.id, 
            "content": serialize_config(workorder)
        }
        
        payload["team"] = {
            "id": team.id,
            "content": serialize_config(team)
        }
        
        payload["runtime"] = {
            "id": runtime.id,
            "content": serialize_config(runtime)
        }
        
        # Prepare request
        url = f"{self.api_base}/{self.api_version}/jobs"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Log submission
        logger.info(f"Submitting job with workorder: {workorder.id}, team: {team.id}, runtime: {runtime.id} to {url}")
        
        # Send request
        try:
            response = await self.http_client.post(url, headers=headers, json=payload)
            
            # Handle errors
            if response.status_code != 200 and response.status_code != 201:
                logger.error(f"C4H API error: status_code={response.status_code}, response={response.text}")
                
                error_msg = f"C4H API error: {response.status_code}"
                try:
                    error_data = response.json()
                    if "message" in error_data:
                        error_msg = error_data["message"]
                except:
                    error_msg = response.text
                
                return JobSubmissionResponse(
                    job_id="",
                    status="error",
                    message=error_msg
                )
            
            # Parse response
            response_data = response.json()
            
            return JobSubmissionResponse(
                job_id=response_data.get("job_id", ""),
                status=response_data.get("status", "submitted"),
                message=response_data.get("message")
            )
        except Exception as e:
            logger.error(f"Error submitting job: {str(e)}")
            return JobSubmissionResponse(
                job_id="",
                status="error",
                message=f"Error submitting job: {str(e)}"
            )
    
    async def get_job_status(self, job_id: str) -> JobStatusResponse:
        """Check the status of a job."""
        if not self.api_key:
            raise ValueError(f"C4H API key not found in environment variable {self.api_key_env}")
        
        # Prepare request
        url = f"{self.api_base}/{self.api_version}/jobs/{job_id}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Log status check
        logger.debug(f"Checking status of job {job_id}")
        
        # Send request
        try:
            response = await self.http_client.get(url, headers=headers)
            
            # Handle errors
            if response.status_code != 200:
                logger.error(f"C4H API error: status_code={response.status_code}, response={response.text}")
                
                error_msg = f"C4H API error: {response.status_code}"
                try:
                    error_data = response.json()
                    if "message" in error_data:
                        error_msg = error_data["message"]
                except:
                    error_msg = response.text
                
                # Return a minimal response with error
                return JobStatusResponse(
                    job_id=job_id,
                    status="error",
                    error=error_msg,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
            
            # Parse response
            response_data = response.json()
            
            # Convert API response to our model
            return JobStatusResponse(
                job_id=response_data.get("job_id", job_id),
                status=response_data.get("status", "unknown"),
                progress=response_data.get("progress"),
                result=response_data.get("result"),
                error=response_data.get("error"),
                created_at=datetime.fromisoformat(response_data.get("created_at", datetime.utcnow().isoformat())),
                updated_at=datetime.fromisoformat(response_data.get("updated_at", datetime.utcnow().isoformat()))
            )
        except Exception as e:
            logger.error(f"Error checking job status: {str(e)}")
            # Return a minimal response with error
            return JobStatusResponse(
                job_id=job_id,
                status="error",
                error=f"Error checking job status: {str(e)}",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a job."""
        if not self.api_key:
            raise ValueError(f"C4H API key not found in environment variable {self.api_key_env}")
        
        # Prepare request
        url = f"{self.api_base}/{self.api_version}/jobs/{job_id}/cancel"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Log cancellation
        logger.info(f"Cancelling job {job_id}")
        
        # Send request
        try:
            response = await self.http_client.post(url, headers=headers)
            
            # Handle errors
            if response.status_code != 200:
                logger.error(f"C4H API error: status_code={response.status_code}, response={response.text}")
                return False
            
            # Parse response
            response_data = response.json()
            
            # Check if cancellation was successful
            return response_data.get("status") == "cancelled"
        except Exception as e:
            logger.error(f"Error cancelling job: {str(e)}")
            return False
    
    async def close(self):
        """Close the HTTP client."""
        await self.http_client.aclose()
        logger.info("C4H service client closed")