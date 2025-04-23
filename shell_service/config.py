"""
Configuration module for the Shell Service.
Loads environment-specific configuration from a central environments.json file.
"""

import os
import json
import glob
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

from shell_service.models.preferences import LayoutDefinition

logger = logging.getLogger(__name__)

# Determine current environment from APP_ENV environment variable
CURRENT_ENV = os.environ.get("APP_ENV", "development")

# Define path to the central configuration file
# Assuming this module is at shell_service/config.py and environments.json is at project root
ENV_CONFIG_PATH = Path(__file__).parent.parent / "environments.json"

# Define path to layout templates
LAYOUTS_DIR = Path(__file__).parent / "data" / "layouts"

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

def load_layout_templates() -> Dict[str, LayoutDefinition]:
    """
    Load layout template definitions from JSON files in the layouts directory.
    
    Returns:
        Dict[str, LayoutDefinition]: Dictionary of layout templates with layout ID as key.
    """
    layout_templates = {}
    
    # Ensure the layouts directory exists
    os.makedirs(LAYOUTS_DIR, exist_ok=True)
    
    # Find all .layout.json files
    layout_files = glob.glob(str(LAYOUTS_DIR / "*.layout.json"))
    
    for layout_file in layout_files:
        try:
            with open(layout_file, "r") as f:
                layout_data = json.load(f)
                layout = LayoutDefinition(**layout_data)
                layout_templates[layout.id] = layout
                logger.info(f"Loaded layout template: {layout.name} ({layout.id})")
        except Exception as e:
            logger.error(f"Error loading layout template from {layout_file}: {e}", exc_info=True)
    return layout_templates
CURRENT_ENV_CONFIG = load_environment_config()