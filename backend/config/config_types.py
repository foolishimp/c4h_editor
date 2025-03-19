# backend/config/config_types.py
"""
Configuration type registry for the C4H Editor backend.
Defines supported configuration types and their properties.
"""

from typing import Dict, Any, List, Optional
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Default configuration types
DEFAULT_CONFIG_TYPES = {
    "workorder": {
        "name": "Work Orders",
        "description": "Defines what needs to be done and against which asset",
        "supportsVersioning": True,
        "schema": "schemas/workorder.json",
        "repository": {
            "type": "git",
            "path": "repositories/workorders"
        }
    },
    "teamconfig": {
        "name": "Team Configuration",
        "description": "Defines agent teams and their capabilities",
        "supportsVersioning": True,
        "schema": "schemas/teamconfig.json",
        "repository": {
            "type": "git",
            "path": "repositories/teamconfigs"
        }
    },
    "runtimeconfig": {
        "name": "Runtime Configuration",
        "description": "Manages operational aspects of the C4H Service",
        "supportsVersioning": True,
        "schema": "schemas/runtimeconfig.json",
        "repository": {
            "type": "git",
            "path": "repositories/runtimeconfigs"
        }
    }
}

# Global config types store
_CONFIG_TYPES = {}

def load_config_types(config_path: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    Load configuration types from file or use defaults.
    
    Args:
        config_path: Path to config types JSON file
        
    Returns:
        Dictionary of configuration types
    """
    global _CONFIG_TYPES
    
    # Start with defaults
    config_types = DEFAULT_CONFIG_TYPES.copy()
    
    # Load from file if provided
    if config_path and Path(config_path).exists():
        try:
            with open(config_path, 'r') as f:
                custom_types = json.load(f)
                
            # Merge with defaults
            for type_key, type_info in custom_types.items():
                config_types[type_key] = type_info
                
            logger.info(f"Loaded {len(custom_types)} configuration types from {config_path}")
        except Exception as e:
            logger.error(f"Error loading configuration types: {e}")
    
    # Store in global variable
    _CONFIG_TYPES = config_types
    
    return config_types

def get_config_types() -> Dict[str, Dict[str, Any]]:
    """
    Get all registered configuration types.
    
    Returns:
        Dictionary of configuration types
    """
    global _CONFIG_TYPES
    
    # Load defaults if not loaded yet
    if not _CONFIG_TYPES:
        return load_config_types()
        
    return _CONFIG_TYPES

def get_config_type(type_key: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific configuration type by key.
    
    Args:
        type_key: Configuration type key
        
    Returns:
        Configuration type info or None if not found
    """
    config_types = get_config_types()
    return config_types.get(type_key)

def validate_config_type(type_key: str) -> bool:
    """
    Validate that a configuration type exists.
    
    Args:
        type_key: Configuration type key
        
    Returns:
        True if valid, raises ValueError otherwise
    """
    if get_config_type(type_key) is None:
        raise ValueError(f"Invalid configuration type: {type_key}")
    return True

def get_repo_path(type_key: str) -> str:
    """
    Get repository path for a configuration type.
    
    Args:
        type_key: Configuration type key
        
    Returns:
        Path to repository
    """
    config_type = get_config_type(type_key)
    if not config_type:
        raise ValueError(f"Invalid configuration type: {type_key}")
        
    return config_type.get("repository", {}).get("path", f"repositories/{type_key}")
