# File: backend/services/lineage_tracker.py
"""
Service for tracking prompt lineage and usage.
"""

from datetime import datetime
from typing import Dict, Any, Optional
import logging
import json
from pathlib import Path

logger = logging.getLogger(__name__)

class LineageTracker:
    """
    Simple lineage tracker that logs prompt operations.
    This is a placeholder implementation - in production, 
    you would connect to OpenLineage or a similar system.
    """
    
    def __init__(self, storage_path: str = "./data/lineage"):
        """
        Initialize the lineage tracker.
        
        Args:
            storage_path: Path to store lineage data
        """
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Lineage tracker initialized with storage path: {storage_path}")
    
    def _log_event(self, event_type: str, data: Dict[str, Any]):
        """Log an event to the lineage store."""
        event_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            **data
        }
        
        # Create a file for the event
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
        event_file = self.storage_path / f"{event_type}_{timestamp}.json"
        
        with open(event_file, "w") as f:
            json.dump(event_data, f, indent=2)
        
        # Log using Python standard logging with format strings
        log_message = f"Lineage event logged: {event_type}"
        # Only include a few key fields in the log message
        if "prompt_id" in data:
            log_message += f", prompt_id: {data['prompt_id']}"
        if "version" in data:
            log_message += f", version: {data['version']}"
        
        logger.info(log_message)
    
    def track_prompt_creation(self, prompt_id: str, version: str, 
                             commit_hash: str, metadata: Dict[str, Any]):
        """Track prompt creation event."""
        self._log_event("prompt_created", {
            "prompt_id": prompt_id,
            "version": version,
            "commit_hash": commit_hash,
            "metadata": metadata
        })
    
    def track_prompt_update(self, prompt_id: str, version: str, 
                           commit_hash: str, metadata: Dict[str, Any]):
        """Track prompt update event."""
        self._log_event("prompt_updated", {
            "prompt_id": prompt_id,
            "version": version,
            "commit_hash": commit_hash,
            "metadata": metadata
        })
    
    def track_prompt_deletion(self, prompt_id: str, commit_hash: str):
        """Track prompt deletion event."""
        self._log_event("prompt_deleted", {
            "prompt_id": prompt_id,
            "commit_hash": commit_hash
        })
    
    def track_prompt_test(self, prompt_id: str, version: str, 
                         parameters: Dict[str, Any], 
                         rendered_prompt: str, 
                         model_response: Optional[str] = None):
        """Track prompt test event."""
        self._log_event("prompt_tested", {
            "prompt_id": prompt_id,
            "version": version,
            "parameters": parameters,
            "rendered_prompt": rendered_prompt,
            "model_response": model_response
        })