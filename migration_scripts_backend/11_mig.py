#!/usr/bin/env python
# Script to create a migration utility

import os
import sys
from pathlib import Path

# Ensure backend directory exists
backend_dir = Path("backend")
if not backend_dir.exists():
    print("Error: backend directory not found")
    sys.exit(1)

# Create scripts directory if it doesn't exist
scripts_dir = backend_dir / "scripts"
scripts_dir.mkdir(exist_ok=True)

# Create migrate_workorders.py
migrate_script_path = scripts_dir / "migrate_workorders.py"
with open(migrate_script_path, "w") as f:
    f.write("""#!/usr/bin/env python
\"\"\"
Migration script to convert existing workorders to new configuration format.
This script should be run once during the transition to the new architecture.
\"\"\"

import os
import json
import sys
import logging
from pathlib import Path
import shutil
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the project root to the path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models.workorder import WorkOrder as LegacyWorkOrder
from backend.models.workorder import WorkOrderTemplate, WorkOrderMetadata, WorkOrderConfig
from backend.models.configuration import Configuration, ConfigurationMetadata
from backend.services.workorder_repository import WorkOrderRepository as LegacyRepository
from backend.services.config_repository import ConfigRepository

def migrate_workorders(source_path: str, dest_path: str = None):
    \"\"\"
    Migrate workorders from the legacy format to the new configuration format.
    
    Args:
        source_path: Path to legacy workorder repository
        dest_path: Path to new workorder repository (optional)
    \"\"\"
    # Initialize repositories
    legacy_repo = LegacyRepository(source_path)
    
    if not dest_path:
        # Use default path based on config types
        from backend.config.config_types import get_repo_path
        dest_path = get_repo_path("workorder")
    
    # Ensure destination directory exists
    dest_dir = Path(dest_path)
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # Create new repository
    new_repo = ConfigRepository("workorder", dest_path)
    
    # Get all legacy workorders
    legacy_workorders = legacy_repo.list_workorders()
    
    logger.info(f"Found {len(legacy_workorders)} workorders to migrate")
    
    # Counters for statistics
    migrated = 0
    failed = 0
    
    # Process each workorder
    for workorder_info in legacy_workorders:
        workorder_id = workorder_info["id"]
        
        try:
            # Get the full workorder
            legacy_workorder = legacy_repo.get_workorder(workorder_id)
            
            # Create WorkOrderContent from legacy template
            content = {
                "template": legacy_workorder.template.dict()
            }
            
            # Create new configuration
            new_config = Configuration(
                id=workorder_id,
                config_type="workorder",
                content=content,
                metadata=legacy_workorder.metadata.dict(),
                parent_id=legacy_workorder.parent_id,
                lineage=legacy_workorder.lineage
            )
            
            # Save to new repository
            new_repo.create_config(
                config=new_config,
                commit_message=f"Migrated from legacy workorder: {workorder_id}",
                author="migration-script"
            )
            
            logger.info(f"Successfully migrated workorder: {workorder_id}")
            migrated += 1
            
        except Exception as e:
            logger.error(f"Failed to migrate workorder {workorder_id}: {str(e)}")
            failed += 1
    
    logger.info(f"Migration complete: {migrated} migrated, {failed} failed")

def create_backup(path: str):
    \"\"\"Create a backup of the repository.\"\"\"
    source_path = Path(path)
    if not source_path.exists():
        logger.warning(f"Source path does not exist: {path}")
        return
        
    # Create backup directory
    backup_dir = source_path.parent / f"{source_path.name}_backup_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Copy files
    shutil.copytree(source_path, backup_dir)
    
    logger.info(f"Created backup at {backup_dir}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate workorders to new configuration format")
    parser.add_argument("--source", help="Path to legacy workorder repository", default="./data/workorder_repository")
    parser.add_argument("--dest", help="Path to new workorder configuration repository")
    parser.add_argument("--backup", help="Create a backup before migration", action="store_true")
    
    args = parser.parse_args()
    
    if args.backup:
        create_backup(args.source)
    
    migrate_workorders(args.source, args.dest)
""")

print(f"Created {migrate_script_path}")

# Create schema directory and examples
schema_dir = backend_dir / "schemas"
schema_dir.mkdir(exist_ok=True)

# Create workorder.json schema
workorder_schema_path = schema_dir / "workorder.json"
with open(workorder_schema_path, "w") as f:
    f.write("""{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WorkOrder Schema",
  "description": "Schema for Work Order configurations",
  "type": "object",
  "required": ["template"],
  "properties": {
    "template": {
      "type": "object",
      "required": ["text"],
      "properties": {
        "text": {
          "type": "string",
          "description": "The workorder template text"
        },
        "parameters": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "type"],
            "properties": {
              "name": {
                "type": "string",
                "description": "Name of the parameter"
              },
              "type": {
                "type": "string",
                "enum": ["string", "number", "boolean", "array", "object"],
                "description": "Data type of the parameter"
              },
              "description": {
                "type": "string",
                "description": "Description of the parameter"
              },
              "default": {
                "description": "Default value for the parameter"
              },
              "required": {
                "type": "boolean",
                "description": "Whether the parameter is required"
              }
            }
          }
        },
        "config": {
          "type": "object",
          "properties": {
            "temperature": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "default": 0.7,
              "description": "Temperature for generation"
            },
            "max_tokens": {
              "type": "integer",
              "minimum": 1,
              "description": "Maximum tokens to generate"
            },
            "top_p": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "description": "Top-p sampling"
            },
            "frequency_penalty": {
              "type": "number",
              "minimum": 0,
              "maximum": 2,
              "description": "Frequency penalty"
            },
            "presence_penalty": {
              "type": "number",
              "minimum": 0,
              "maximum": 2,
              "description": "Presence penalty"
            },
            "stop_sequences": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Sequences that stop generation"
            },
            "service_id": {
              "type": "string",
              "description": "Target C4H service ID"
            },
            "workflow_id": {
              "type": "string",
              "description": "Workflow ID for processing"
            },
            "max_runtime": {
              "type": "integer",
              "description": "Maximum runtime in seconds"
            },
            "notify_on_completion": {
              "type": "boolean",
              "description": "Whether to notify on completion"
            },
            "parameters": {
              "type": "object",
              "description": "Service-specific parameters"
            }
          }
        }
      }
    }
  }
}""")

print(f"Created {workorder_schema_path}")

# Create teamconfig.json schema
teamconfig_schema_path = schema_dir / "teamconfig.json"
with open(teamconfig_schema_path, "w") as f:
    f.write("""{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TeamConfig Schema",
  "description": "Schema for Team Configuration",
  "type": "object",
  "properties": {
    "roles": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the role"
          },
          "description": {
            "type": "string",
            "description": "Description of the role"
          },
          "capabilities": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Capabilities of the role"
          },
          "model": {
            "type": "string",
            "description": "LLM model for this role"
          },
          "config": {
            "type": "object",
            "description": "Configuration for this role"
          }
        }
      }
    },
    "teams": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "agents"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the team"
          },
          "description": {
            "type": "string",
            "description": "Description of the team"
          },
          "agents": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["id", "name", "role"],
              "properties": {
                "id": {
                  "type": "string",
                  "description": "Unique identifier for the agent"
                },
                "name": {
                  "type": "string",
                  "description": "Name of the agent"
                },
                "role": {
                  "type": "string",
                  "description": "Role of the agent"
                },
                "description": {
                  "type": "string",
                  "description": "Description of the agent"
                },
                "config": {
                  "type": "object",
                  "description": "Agent-specific configuration"
                }
              }
            }
          },
          "workflow": {
            "type": "object",
            "description": "Team workflow configuration"
          }
        }
      }
    },
    "default_team": {
      "type": "string",
      "description": "Default team to use"
    },
    "global_config": {
      "type": "object",
      "description": "Global team configuration"
    }
  }
}""")

print(f"Created {teamconfig_schema_path}")

# Create runtimeconfig.json schema
runtimeconfig_schema_path = schema_dir / "runtimeconfig.json"
with open(runtimeconfig_schema_path, "w") as f:
    f.write("""{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RuntimeConfig Schema",
  "description": "Schema for Runtime Configuration",
  "type": "object",
  "properties": {
    "resource_limits": {
      "type": "object",
      "properties": {
        "max_tokens": {
          "type": "integer",
          "description": "Maximum tokens per request"
        },
        "max_runtime": {
          "type": "integer",
          "description": "Maximum runtime in seconds"
        },
        "max_concurrent_jobs": {
          "type": "integer",
          "description": "Maximum concurrent jobs"
        },
        "token_bucket_size": {
          "type": "integer",
          "description": "Token bucket size for rate limiting"
        },
        "token_refill_rate": {
          "type": "number",
          "description": "Token refill rate per second"
        }
      }
    },
    "notifications": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "default": true,
          "description": "Whether notifications are enabled"
        },
        "on_completion": {
          "type": "boolean",
          "default": true,
          "description": "Notify on job completion"
        },
        "on_failure": {
          "type": "boolean",
          "default": true,
          "description": "Notify on job failure"
        },
        "channels": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Notification channels"
        },
        "webhook_url": {
          "type": "string",
          "description": "Webhook URL for notifications"
        }
      }
    },
    "models": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["provider", "model_id"],
        "properties": {
          "provider": {
            "type": "string",
            "description": "Model provider (e.g., anthropic, openai)"
          },
          "model_id": {
            "type": "string",
            "description": "Model identifier"
          },
          "version": {
            "type": "string",
            "description": "Model version"
          },
          "parameters": {
            "type": "object",
            "description": "Model parameters"
          },
          "enabled": {
            "type": "boolean",
            "default": true,
            "description": "Whether this model is enabled"
          }
        }
      }
    },
    "default_model": {
      "type": "string",
      "description": "Default model to use"
    },
    "environment_variables": {
      "type": "object",
      "additionalProperties": {
        "type": "string"
      },
      "description": "Environment variables"
    },
    "feature_flags": {
      "type": "object",
      "additionalProperties": {
        "type": "boolean"
      },
      "description": "Feature flags"
    }
  }
}""")

print(f"Created {runtimeconfig_schema_path}")

print("Migration Script and Schemas created successfully.")