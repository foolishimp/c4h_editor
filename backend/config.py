"""
Configuration management for the prompt editor backend.
Follows the Config Design Principles with hierarchical structure.
"""

import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
from backend.config.config_types import load_config_types


# Default configuration
DEFAULT_CONFIG = {
    "app": {
        "name": "prompt-editor",
        "environment": "development",
    },
    "repository": {
        "path": "./data/prompt_repository",
        "backup_path": "./data/backups",
    },
    "lineage": {
        "enabled": True,
        "backend": "file",
        "file_path": "./data/lineage",
    },
    "api": {
        "cors_origins": ["*"],
    },
    "llm": {
        "provider": "anthropic",
        "model": "claude-3-opus-20240229",
        "api_key_env": "ANTHROPIC_API_KEY",
    },
    "c4h_service": {
        "api_base": "https://api.c4h.example.com",
        "api_version": "v1",
        "api_key_env": "C4H_API_KEY",
        "default_config": {
            "max_runtime": 3600,
            "notify_on_completion": True
        }
    }
}


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Load configuration from file and merge with defaults.
    
    Args:
        config_path: Path to YAML configuration file
        
    Returns:
        Merged configuration dictionary
    """
    config = DEFAULT_CONFIG.copy()
    
    if config_path and os.path.exists(config_path):
        with open(config_path, "r") as f:
            file_config = yaml.safe_load(f)
            if file_config:
                # Merge with defaults using deep update
                config = deep_update(config, file_config)
    
    # Apply environment variables override
    env_config = {}
    for key, value in os.environ.items():
        if key.startswith("PROMPT_EDITOR_"):
            path = key[14:].lower().split("_")
            current = env_config
            for p in path[:-1]:
                if p not in current:
                    current[p] = {}
                current = current[p]
            current[path[-1]] = value
    
    # Merge environment overrides
    if env_config:
        config = deep_update(config, env_config)
    
    return config


def deep_update(base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deep update a nested dictionary.
    
    Args:
        base: Base dictionary to update
        update: Dictionary with updates
        
    Returns:
        Updated dictionary
    """
    result = base.copy()
    
    for key, value in update.items():
        if isinstance(value, dict) and key in result and isinstance(result[key], dict):
            result[key] = deep_update(result[key], value)
        else:
            result[key] = value
    
    return result


def get_by_path(config: Dict[str, Any], path: list) -> Any:
    """
    Get a value from a nested dictionary by path.
    
    Args:
        config: Configuration dictionary
        path: List of keys forming a path
        
    Returns:
        Value at path or None if not found
    """
    result = config
    for key in path:
        if isinstance(result, dict) and key in result:
            result = result[key]
        else:
            return None
    return result