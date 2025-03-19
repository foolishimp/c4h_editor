#!/usr/bin/env python
# Script to create configuration type registry

import os
import sys
from pathlib import Path

# Ensure backend directory exists
backend_dir = Path("backend")
if not backend_dir.exists():
    print("Error: backend directory not found")
    sys.exit(1)

# Create config directory if needed
config_dir = backend_dir / "config"
config_dir.mkdir(exist_ok=True)

# Create __init__.py if needed
init_path = config_dir / "__init__.py"
if not init_path.exists():
    with open(init_path, "w") as f:
        f.write("# backend/config/__init__.py\n")

# Create config_types.py
config_types_path = config_dir / "config_types.py"
with open(config_types_path, "w") as f:
    f.write("""# backend/config/config_types.py
\"\"\"
Configuration type registry for the C4H Editor backend.
Defines supported configuration types and their properties.
\"\"\"

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
    \"\"\"
    Load configuration types from file or use defaults.
    
    Args:
        config_path: Path to config types JSON file
        
    Returns:
        Dictionary of configuration types
    \"\"\"
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
    \"\"\"
    Get all registered configuration types.
    
    Returns:
        Dictionary of configuration types
    \"\"\"
    global _CONFIG_TYPES
    
    # Load defaults if not loaded yet
    if not _CONFIG_TYPES:
        return load_config_types()
        
    return _CONFIG_TYPES

def get_config_type(type_key: str) -> Optional[Dict[str, Any]]:
    \"\"\"
    Get a specific configuration type by key.
    
    Args:
        type_key: Configuration type key
        
    Returns:
        Configuration type info or None if not found
    \"\"\"
    config_types = get_config_types()
    return config_types.get(type_key)

def validate_config_type(type_key: str) -> bool:
    \"\"\"
    Validate that a configuration type exists.
    
    Args:
        type_key: Configuration type key
        
    Returns:
        True if valid, raises ValueError otherwise
    \"\"\"
    if get_config_type(type_key) is None:
        raise ValueError(f"Invalid configuration type: {type_key}")
    return True

def get_repo_path(type_key: str) -> str:
    \"\"\"
    Get repository path for a configuration type.
    
    Args:
        type_key: Configuration type key
        
    Returns:
        Path to repository
    \"\"\"
    config_type = get_config_type(type_key)
    if not config_type:
        raise ValueError(f"Invalid configuration type: {type_key}")
        
    return config_type.get("repository", {}).get("path", f"repositories/{type_key}")
""")

print(f"Created {config_types_path}")

# Update config.py to use the registry
config_path = backend_dir / "config.py"
if config_path.exists():
    with open(config_path, "r") as f:
        content = f.read()
    
    # Ensure import for config_types
    if "from backend.config.config_types import" not in content:
        # Add import after other imports
        import_line = "from backend.config.config_types import load_config_types\n"
        if "import" in content:
            # Find the last import line
            lines = content.split("\n")
            last_import_idx = 0
            for i, line in enumerate(lines):
                if line.startswith("import ") or line.startswith("from "):
                    last_import_idx = i
            
            # Insert after the last import
            lines.insert(last_import_idx + 1, import_line)
            content = "\n".join(lines)
        else:
            # No imports, add at top after docstring
            if '"""' in content:
                docstring_end = content.find('"""', content.find('"""') + 3) + 3
                content = content[:docstring_end] + "\n\n" + import_line + content[docstring_end:]
            else:
                content = import_line + content
    
    # Add load_config_types to load_config function
    if "load_config(" in content and "load_config_types" not in content:
        load_config_func = "def load_config("
        func_start = content.find(load_config_func)
        if func_start != -1:
            # Find the end of the function
            func_body_start = content.find(":", func_start) + 1
            indent = "    "  # Assume 4 spaces
            
            # Find location right before final return
            return_pos = content.find(f"{indent}return", func_body_start)
            if return_pos != -1:
                # Add load_config_types call before return
                config_types_load = f"\n{indent}# Load configuration types\n{indent}load_config_types(config_path)\n"
                content = content[:return_pos] + config_types_load + content[return_pos:]
    
    # Write updated content
    with open(config_path, "w") as f:
        f.write(content)
    
    print(f"Updated {config_path}")

print("Configuration Type Registry created successfully.")