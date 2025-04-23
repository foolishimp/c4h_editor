"""
Configuration module for the Shell Service.
Loads environment-specific configuration from a central environments.json file
and layout templates from the data/layouts directory.
"""

import os
import json
import glob
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

# Attempt to import LayoutDefinition and ValidationError, handle potential errors
try:
    from shell_service.models.preferences import LayoutDefinition
    from pydantic import ValidationError
except ImportError:
    print("Error: Failed to import required models (LayoutDefinition, ValidationError).")
    print("Ensure you are running from the project root and the virtual environment is active.")
    class LayoutDefinition: pass
    class ValidationError(Exception): pass

logger = logging.getLogger(__name__)

# Determine current environment from APP_ENV environment variable
CURRENT_ENV = os.environ.get("APP_ENV", "development")

# Define path to the central configuration file
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
ENV_CONFIG_PATH = PROJECT_ROOT / "environments.json"

# Define path to layout templates relative to this file's parent directory
LAYOUTS_DIR = Path(__file__).parent / "data" / "layouts"

# Load environment configuration (function only, not called at module level)
def load_environment_config() -> Dict[str, Any]:
    """Load the configuration for the current environment."""
    resolved_env_path = ENV_CONFIG_PATH.resolve()
    logger.info(f"Attempting to load environment config from: {resolved_env_path}")
    try:
        if not resolved_env_path.exists():
            logger.warning(f"Environment config file not found at {resolved_env_path}. Using empty config.")
            return {}

        with open(resolved_env_path, "r", encoding="utf-8") as f:
            all_configs = json.load(f)

        if CURRENT_ENV not in all_configs:
            logger.warning(f"Environment '{CURRENT_ENV}' not found in {resolved_env_path}. Using empty config.")
            return {}

        logger.info(f"Loaded configuration for environment: {CURRENT_ENV}")
        return all_configs[CURRENT_ENV]
    except json.JSONDecodeError as e:
         logger.error(f"Error decoding JSON from {resolved_env_path}: {e}")
         return {}
    except Exception as e:
        logger.error(f"Error loading environment config from {resolved_env_path}: {e}", exc_info=True)
        return {}

# Load layout templates function (includes previous logging enhancements)
def load_layout_templates() -> Dict[str, LayoutDefinition]:
    """
    Load layout template definitions from JSON files in the layouts directory.
    Returns:
        Dict[str, LayoutDefinition]: Dictionary of layout templates with layout ID as key.
    """
    layout_templates: Dict[str, LayoutDefinition] = {}
    resolved_layouts_dir = LAYOUTS_DIR.resolve()
    logger.info(f"Attempting to load layouts from resolved path: {resolved_layouts_dir}")

    if not resolved_layouts_dir.is_dir():
        logger.error(f"Layouts directory does NOT exist: {resolved_layouts_dir}")
        return {}

    layout_files_pattern = str(resolved_layouts_dir / "*.layout.json")
    logger.info(f"Using glob pattern: {layout_files_pattern}")
    try:
        layout_files = glob.glob(layout_files_pattern)
        logger.info(f"Found {len(layout_files)} files matching pattern: {layout_files}")
    except Exception as glob_err:
        logger.error(f"Error during glob execution for pattern {layout_files_pattern}: {glob_err}", exc_info=True)
        return {}

    for layout_file_path_str in layout_files:
        layout_file = Path(layout_file_path_str)
        logger.debug(f"Attempting to process file: {layout_file.name}")
        try:
            with open(layout_file, "r", encoding="utf-8") as f:
                layout_data = json.load(f)
            logger.debug(f"Successfully read JSON from {layout_file.name}")
            layout = LayoutDefinition(**layout_data)
            layout_templates[layout.id] = layout
            logger.info(f"Loaded and validated layout template: {layout.name} ({layout.id}) from {layout_file.name}")
        except json.JSONDecodeError as json_err:
             logger.error(f"JSON Decode Error in {layout_file.name}: {json_err}")
        except ValidationError as val_err:
             logger.error(f"Pydantic Validation Error in {layout_file.name}: {val_err}")
        except Exception as e:
            logger.error(f"Error loading layout template from {layout_file.name}: {e}", exc_info=True)

    logger.info(f"Finished loading layouts. Total successfully loaded: {len(layout_templates)}")
    return layout_templates

# REMOVED: CURRENT_ENV_CONFIG = load_environment_config()