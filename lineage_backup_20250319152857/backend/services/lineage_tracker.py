# File: backend/services/lineage_tracker.py
"""
Service for tracking workorder lineage and usage.
"""

from datetime import datetime
from typing import Dict, Any, Optional
import logging
import json
from pathlib import Path

logger = logging.getLogger(__name__)

class LineageTracker:
    """
    Simple lineage tracker that logs workorder operations.
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
        if "workorder_id" in data:
            log_message += f", workorder_id: {data['workorder_id']}"
        if "version" in data:
            log_message += f", version: {data['version']}"
        
        logger.info(log_message)
    
    def track_workorder_creation(self, workorder_id: str, version: str, 
                              commit_hash: str, metadata: Dict[str, Any]):
        """Track workorder creation event."""
        self._log_event("workorder_created", {
            "workorder_id": workorder_id,
            "version": version,
            "commit_hash": commit_hash,
            "metadata": metadata
        })
    
    def track_workorder_update(self, workorder_id: str, version: str, 
                              commit_hash: str, metadata: Dict[str, Any]):
        """Track workorder update event."""
        self._log_event("workorder_updated", {
            "workorder_id": workorder_id,
            "version": version,
            "commit_hash": commit_hash,
            "metadata": metadata
        })
    
    def track_workorder_deletion(self, workorder_id: str, commit_hash: str):
        """Track workorder deletion event."""
        self._log_event("workorder_deleted", {
            "workorder_id": workorder_id,
            "commit_hash": commit_hash
        })
    
    def track_workorder_test(self, workorder_id: str, version: str, 
                         parameters: Dict[str, Any], 
                         rendered_workorder: str, 
                         model_response: Optional[str] = None):
        """Track workorder test event."""
        self._log_event("workorder_tested", {
            "workorder_id": workorder_id,
            "version": version,
            "parameters": parameters,
            "rendered_workorder": rendered_workorder,
            "model_response": model_response
        })