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
    
    async def submit_job_with_configs(self, configurations: List[Dict[str, Any]]) -> JobSubmissionResponse:
        """
        Submit a job with a list of configuration objects to the C4H service.
        
        Args:
            configurations: List of configuration objects in priority order (leftmost = highest priority)
                           These will be sent directly to the C4H Service for internal merging
        
        Returns:
            JobSubmissionResponse with job_id and status
        """
        if not configurations or not isinstance(configurations, list):
            raise ValueError("configurations must be a non-empty list")

        logger.info(f"Preparing job submission with {len(configurations)} configurations")
        
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
        try:
            # Log the configurations being sent (safely limiting detail for large configs)
            config_summary = [f"Config {i}: {c.get('id', 'unknown')} ({c.get('config_type', 'unknown')})" 
                             for i, c in enumerate(configurations)]
            logger.info(f"Configurations in submission: {config_summary}")
        except Exception as e:
            logger.error(f"Error logging config summary: {e}")
        
        try:
            # --- START CHANGE ---
            # Wrap the list in the expected dictionary structure
            payload = {"configs": configurations}
            response = await self.http_client.post(url, headers=headers, json=payload)
            # --- END CHANGE ---
            
            if response.status_code >= 400:
                logger.error(f"C4H API error: status_code={response.status_code}, response={response.text}")
                return JobSubmissionResponse(
                    job_id="", status="error", 
                    message=f"C4H API error: {response.status_code} - {response.text}"
                )
            
            response_data = response.json()
            return JobSubmissionResponse(**response_data)
        except Exception as e:
            logger.error(f"Error submitting job: {e}", exc_info=True)
            return JobSubmissionResponse(job_id="", status="error", message=f"Error submitting job: {str(e)}")

    async def submit_job(self, workorder: Configuration = None, team: Configuration = None, runtime: Configuration = None) -> JobSubmissionResponse:
        """Legacy method for backward compatibility - will be deprecated in future releases."""
        """
        Submit a job with multiple configurations to the C4H service.
        Payload structure is aligned with the C4H Service API's JobRequest model,
        accounting for the nested structure within the .content field (content.<config_type>.<data>).
        """
        # Validate inputs
        if not workorder:
            raise ValueError("Workorder configuration is required for job submission")

        logger.info(f"Preparing job submission for workorder={workorder.id}"
                    f"{f', team={team.id}' if team else ''}"
                    f"{f', runtime={runtime.id}' if runtime else ''}")

        # --- Construct payload matching C4H Service JobRequest model ---
        payload = {}

        # 1. Workorder section (Required by JobRequest)
        # Extracts from workorder.content.workorder.<field>
        if isinstance(workorder.content, dict):
            # Get the nested 'workorder' dictionary first
            workorder_data = workorder.content.get("workorder", {})
            if isinstance(workorder_data, dict):
                payload["workorder"] = {
                    "project": workorder_data.get("project", {}),
                    "intent": workorder_data.get("intent", {})
                }
                # Check required fields within the nested structure
                if not payload["workorder"]["project"].get("path"):
                    logger.warning(f"Workorder {workorder.id} content missing 'workorder.project.path'")
                if not payload["workorder"]["intent"].get("description"):
                    logger.warning(f"Workorder {workorder.id} content missing 'workorder.intent.description'")
            else:
                logger.error(f"Workorder {workorder.id} 'content.workorder' is not a dictionary.")
                # Set empty to trigger validation error downstream if needed, or raise here
                payload["workorder"] = {"project": {}, "intent": {}}
                # Or raise ValueError("Invalid content.workorder structure")
        else:
            logger.error(f"Workorder {workorder.id} content is not a dictionary.")
            raise ValueError(f"Invalid content format for workorder {workorder.id}")

        # 2. Team section (Optional by JobRequest)
        # Extracts from team.content.team.<field>
        if team:
            if isinstance(team.content, dict):
                # Get the nested 'team' dictionary first
                team_data = team.content.get("team", {})
                if isinstance(team_data, dict):
                    # Extract only the keys expected by the TeamConfig model
                    team_payload_section = {
                        "llm_config": team_data.get("llm_config"),
                        "orchestration": team_data.get("orchestration")
                    }
                    # Remove keys with None values
                    team_payload_section = {k: v for k, v in team_payload_section.items() if v is not None}
                    if team_payload_section: # Only add if not empty
                        payload["team"] = team_payload_section
                else:
                    logger.warning(f"Team config {team.id} 'content.team' is not a dictionary, skipping team payload section.")
            else:
                logger.warning(f"Team config {team.id} content is not a dictionary, skipping team payload section.")

        # 3. Runtime section (Optional by JobRequest)
        # Assumes runtime.content.runtime.<field> structure
        if runtime:
            if isinstance(runtime.content, dict):
                # Get the nested 'runtime' dictionary first
                runtime_data = runtime.content.get("runtime", {})
                if isinstance(runtime_data, dict):
                    # Extract only the keys expected by the RuntimeConfig model
                    # Note the nested 'runtime' key expected by the server model *within* this section
                    runtime_payload_section = {
                        "runtime": runtime_data.get("runtime"), # Corresponds to RuntimeConfig.runtime
                        "logging": runtime_data.get("logging"),
                        "backup": runtime_data.get("backup")
                    }
                    # Remove keys with None values
                    runtime_payload_section = {k: v for k, v in runtime_payload_section.items() if v is not None}
                    if runtime_payload_section: # Only add if not empty
                        payload["runtime"] = runtime_payload_section
                else:
                    logger.warning(f"Runtime config {runtime.id} 'content.runtime' is not a dictionary, skipping runtime payload section.")
            else:
                logger.warning(f"Runtime config {runtime.id} content is not a dictionary, skipping runtime payload section.")

        # --- End of Payload Construction ---

        # Prepare request URL
        url_parts = [self.api_base]
        if self.api_version:
            url_parts.append(self.api_version)
        url_parts.append("jobs")
        url = "/".join(s.strip('/') for s in url_parts)

        # Prepare headers
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        logger.info(f"Submitting job data to URL: {url}")
        try:
            # Log the exact payload being sent
            payload_json = json.dumps(payload, indent=2)
            # Use INFO level for visibility during debugging
            logger.info(f"Attempting POST request to URL: {url} with payload:\n{payload_json}")
        except Exception as json_err:
            logger.error(f"Failed to serialize payload for logging: {json_err}")
            logger.info(f"Attempting POST request to URL: {url} with payload (raw): {payload}") # Log raw dict as fallback

        # Send request
        try:
            response = await self.http_client.post(url, headers=headers, json=payload)

            # Handle errors (including 422 Validation Errors)
            if response.status_code >= 400:
                logger.error(f"C4H API error: status_code={response.status_code}, response={response.text}")
                error_msg = f"C4H API error: {response.status_code}"
                try:
                    error_data = response.json()
                    detail = error_data.get("detail")
                    if isinstance(detail, list) and detail: # FastAPI validation error format
                        try:
                            formatted_errors = "; ".join([f"{e.get('loc', ['unknown'])[-1]}: {e.get('msg', 'validation error')}" for e in detail])
                            error_msg = f"Validation Error ({response.status_code}): {formatted_errors}"
                        except Exception:
                            error_msg = f"Validation Error ({response.status_code}): {json.dumps(detail)}"
                    elif isinstance(detail, str):
                        error_msg += f": {detail}"
                    elif "message" in error_data: error_msg = error_data["message"]
                    elif "error" in error_data: error_msg = error_data["error"]
                except Exception:
                    error_msg = response.text
                return JobSubmissionResponse(job_id="", status="error", message=error_msg)

            # Parse successful response
            response_data = response.json()
            return JobSubmissionResponse(
                job_id=response_data.get("job_id", ""),
                status=response_data.get("status", "unknown"),
                message=response_data.get("message"),
                storage_path=response_data.get("storage_path")
            )
        except httpx.ConnectError as e:
            logger.error(f"Connection Error during POST to {url}: {str(e)}", exc_info=True)
            return JobSubmissionResponse(
                job_id="", status="error", message=f"Connection Error: {str(e)}"
            )
        except Exception as e:
            logger.error(f"HTTP client error during POST to {url}: {str(e)}", exc_info=True)
            return JobSubmissionResponse(
                job_id="", status="error", message=f"Error submitting job: {str(e)}"
            )


    # --- get_job_status and cancel_job remain as modified previously ---
    # (They don't need payload alignment, only URL logging and mock removal)

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
            response = await self.http_client.get(url, headers=headers)

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
            response = await self.http_client.post(url, headers=headers) # Assuming cancel is POST

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