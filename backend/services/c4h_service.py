"""Service client for interacting with the C4H API with support for multiple configurations."""

import os
import json
import logging
from datetime import datetime, UTC
from typing import Dict, List, Optional, Any
import httpx
from pydantic import BaseModel

# Assuming these models are correctly defined relative to this file's location
# based on c4h_editor_front_jobs_006.txt structure
from backend.models.configuration import Configuration
from backend.config import load_config

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class JobSubmissionResponse(BaseModel):
    """Response from job submission."""
    job_id: str
    status: str
    message: Optional[str] = None
    storage_path: Optional[str] = None


class JobStatusResponse(BaseModel):
    """Response from job status check."""
    job_id: str
    status: str
    progress: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime 
    storage_path: Optional[str] = None


class C4HService:
    """Client for the C4H service API."""

    def __init__(self, config_path: Optional[str] = None):
        """Initialize the C4H service client."""
        self.config = load_config(config_path)
        self.c4h_config = self.config.get("c4h_service", {})

        # API configuration
        # Prioritize api_base if set, otherwise construct from host/port
        default_host = self.c4h_config.get("host", "localhost")
        default_port = self.c4h_config.get("port", 5500)
        self.api_base = self.c4h_config.get("api_base", f"http://{default_host}:{default_port}")
        # Default version if not specified in config
        self.api_version = self.c4h_config.get("api_version", "api/v1")

        # API key from environment
        self.api_key_env = self.c4h_config.get("api_key_env", "C4H_API_KEY")
        self.api_key = os.environ.get(self.api_key_env)

        if not self.api_key:
            logger.info(f"C4H API key not found in environment variable {self.api_key_env} - proceeding without authentication header")

        # Initialize HTTP client
        self.http_client = httpx.AsyncClient(timeout=1200.0)

        logger.info(f"C4H service client initialized with API base: {self.api_base}, API version: {self.api_version}")

    # ADD/REPLACE this function in /Users/jim/src/apps/c4h_editor/backend/services/c4h_service.py
    
    async def submit_job_with_configs(self, config_contents: List[Dict[str, Any]]) -> JobSubmissionResponse:
        """
        Submit a job with a list of configuration objects to the C4H service.

        Args:
            config_contents: List of configuration *content* dictionaries in priority order.
                        These will be sent directly to the C4H Service for internal merging

        Returns:
            JobSubmissionResponse with job_id and status
        """
        if not config_contents or not isinstance(config_contents, list):
            raise ValueError("configurations must be a non-empty list")

        logger.info(f"Preparing job submission to C4H service with {len(config_contents)} config content objects.")

        # Create URL
        url_parts = [self.api_base]
        if self.api_version:
            url_parts.append(self.api_version)
        url_parts.append("jobs")
        url = "/".join(s.strip('/') for s in url_parts)

        # Prepare headers
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        logger.info(f"Submitting job to URL: {url}")

        # --- Main Try Block ---
        try:
            # --- Logging logic moved inside the main try block ---
            payload = {"configs": config_contents}
            log_limit = 20000
            try:
                # Attempt to serialize and log the payload (truncated)
                payload_str = json.dumps(payload, indent=2, default=str)
                logged_payload = payload_str[:log_limit] + ('...' if len(payload_str) > log_limit else '')
                logger.debug(f"C4H Service Client: Sending payload (truncated):\n{logged_payload}")
            except Exception as log_e:
                # Log a warning if serialization/logging fails, but don't stop the request
                logger.warning(f"C4H Service Client: Could not serialize payload for logging: {log_e}")
            # --- End of moved logging logic ---

            # Make the actual HTTP POST request
            response = await self.http_client.post(url, headers=headers, json=payload)

            # Handle potential API errors (>= 400 status codes)
            if response.status_code >= 400:
                logger.error(f"C4H API error: status_code={response.status_code}, response={response.text}")
                return JobSubmissionResponse(
                    job_id="", status="error",
                    message=f"C4H API error: {response.status_code} - {response.text}"
                )

            # Process successful response
            response_data = response.json()
            logger.info(f"C4H Service job submission successful. Response: {response_data}")
            return JobSubmissionResponse(**response_data)

        # --- Exception handling for the main try block ---
        except httpx.RequestError as req_err: # More specific exception for HTTP client errors
            logger.error(f"C4H Service Client: HTTP Request Error during POST to {url}: {req_err}", exc_info=True)
            return JobSubmissionResponse(job_id="", status="error", message=f"HTTP Request Error: {str(req_err)}")
        except Exception as e: # Catch other potential errors (e.g., during response parsing)
            logger.error(f"C4H Service Client: Unexpected error during POST to {url}: {e}", exc_info=True)
            return JobSubmissionResponse(job_id="", status="error", message=f"Unexpected error submitting job: {str(e)}")

    async def get_job_status(self, job_id: str) -> JobStatusResponse:
        """Check the status of a job."""
        # Prepare request URL
        url_parts = [self.api_base]
        if self.api_version:
            url_parts.append(self.api_version)
        url_parts.append("jobs")
        url_parts.append(job_id)
        url = "/".join(s.strip('/') for s in url_parts)

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        logger.debug(f"Checking status of job {job_id} at {url}")

        # Send real request
        try:
            logger.info(f"Attempting GET request to URL: {url}")
            response = await self.http_client.get(url, headers=headers) # No change needed here

            
            # Handle errors
            if response.status_code >= 400:
                logger.error(f"C4H API error getting status: status_code={response.status_code}, response={response.text}")
                error_msg = f"C4H API error: {response.status_code}"
                try:
                    error_data = response.json()
                    detail = error_data.get("detail", "Unknown error")
                    error_msg += f": {detail}"
                except Exception:
                    error_msg = response.text
                
                # Return a minimal response with error
                return JobStatusResponse(
                    job_id=job_id, status="error", error=error_msg,
                    created_at=datetime.now(UTC), updated_at=datetime.now(UTC) # Provide dummy timestamps
                )

            # Parse successful response
            response_data = response.json()

            # Convert API response to our model, providing defaults for timestamps if missing
            created_at_str = response_data.get("created_at", datetime.utcnow().isoformat())
            updated_at_str = response_data.get("updated_at", datetime.utcnow().isoformat())
            logger.debug(f"C4H Service job status response for {job_id}: {response_data}")
            return JobStatusResponse(
                job_id=response_data.get("job_id", job_id),
                status=response_data.get("status", "unknown"),
                progress=response_data.get("progress"),
                result=response_data.get("result"),
                error=response_data.get("error"),
                storage_path=response_data.get("storage_path"),
                created_at=datetime.fromisoformat(created_at_str),
                updated_at=datetime.fromisoformat(updated_at_str)
            )
        except httpx.ConnectError as e:
             logger.error(f"Connection Error during GET to {url}: {str(e)}", exc_info=True)
             return JobStatusResponse(
                 job_id=job_id, status="error", error=f"Connection Error: {str(e)}",
                 created_at=datetime.now(UTC), updated_at=datetime.now(UTC)
             )
        except Exception as e:
            logger.error(f"HTTP client error during GET to {url}: {str(e)}", exc_info=True)
            # Return a minimal response with error
            return JobStatusResponse(
                job_id=job_id, status="error", error=f"Error checking job status: {str(e)}",
                created_at=datetime.now(UTC), updated_at=datetime.now(UTC)
            )

    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a job."""
        # Prepare request URL
        url_parts = [self.api_base]
        if self.api_version:
            url_parts.append(self.api_version)
        url_parts.append("jobs")
        url_parts.append(job_id)
        url_parts.append("cancel") # Added cancel segment
        url = "/".join(s.strip('/') for s in url_parts)

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        logger.info(f"Attempting to cancel job {job_id} at {url}")

        # Send real request
        try:
            logger.info(f"Attempting POST request to URL: {url}")
            response = await self.http_client.post(url, headers=headers) # No change needed here

            # Handle errors
            if response.status_code >= 400:
                logger.error(f"C4H API error cancelling job: status_code={response.status_code}, response={response.text}")
                return False

            # Parse response (assuming success if no error)
            try:
                response_data = response.json()
                 # Check if cancellation was successful based on expected response structure
                # Adjust this check based on the actual API response for cancel
                was_cancelled = response_data.get("status") in ["cancelled", "cancelling"] # Example check
                logger.info(f"Cancel request for job {job_id} sent. Service responded with status: {response_data.get('status', 'N/A')}")
                return was_cancelled
            except Exception as parse_err:
                 logger.warning(f"Could not parse cancel response JSON for job {job_id}: {parse_err}. Assuming success based on status code {response.status_code}.")
                 return True # Assume success if status code was 2xx but response wasn't expected JSON

        except httpx.ConnectError as e:
            logger.error(f"Connection Error during POST to {url}: {str(e)}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"HTTP client error during POST to {url}: {str(e)}", exc_info=True)
            return False

    async def close(self):
        """Close the HTTP client."""
        await self.http_client.aclose()
        logger.info("C4H service client closed")