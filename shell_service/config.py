"""
Configuration module for the Shell Service.
Loads environment-specific configuration from a central environments.json file.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Determine current environment from APP_ENV environment variable
CURRENT_ENV = os.environ.get("APP_ENV", "development")

# Define path to the central configuration file
# Assuming this module is at shell_service/config.py and environments.json is at project root
ENV_CONFIG_PATH = Path(__file__).parent.parent / "environments.json"

# Load environment configuration
def load_environment_config() -> Dict[str, Any]:
    """Load the configuration for the current environment."""
    try:
        if not ENV_CONFIG_PATH.exists():
            logger.warning(f"Environment config file not found at {ENV_CONFIG_PATH}. Using empty config.")
            return {}

        with open(ENV_CONFIG_PATH, "r") as f:
            all_configs = json.load(f)

        if CURRENT_ENV not in all_configs:
            logger.warning(f"Environment '{CURRENT_ENV}' not found in config file. Using empty config.")
            return {}

        logger.info(f"Loaded configuration for environment: {CURRENT_ENV}")
        return all_configs[CURRENT_ENV]
    except Exception as e:
        logger.error(f"Error loading environment config: {e}", exc_info=True)
        return {}

CURRENT_ENV_CONFIG = load_environment_config()