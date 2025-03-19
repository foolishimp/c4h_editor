#!/usr/bin/env python
# Script to create README and example configuration

import os
import sys
from pathlib import Path

# Create main README file
readme_path = Path("README.md")
with open(readme_path, "w") as f:
    f.write("""# C4H Editor Backend

## Overview

The C4H Editor Backend is a REST API service for managing configurations with version control. It supports multiple configuration types (WorkOrder, TeamConfig, RuntimeConfig) and allows creating, updating, testing, and submitting jobs with multiple configurations to the C4H service for processing.

## Configuration Types

The backend supports the following configuration types out of the box:

- **WorkOrder**: Defines what needs to be done and against which asset
- **TeamConfig**: Defines agent teams and their capabilities
- **RuntimeConfig**: Manages operational aspects of the service

New configuration types can be added through configuration without code changes.

## API Endpoints

### Generic Configuration Endpoints

- `GET /api/v1/config-types`: Get all supported configuration types
- `GET /api/v1/configs/{config_type}`: List all configurations of a specific type
- `GET /api/v1/configs/{config_type}/{config_id}`: Get a specific configuration
- `POST /api/v1/configs/{config_type}`: Create a new configuration
- `PUT /api/v1/configs/{config_type}/{config_id}`: Update a configuration
- `DELETE /api/v1/configs/{config_type}/{config_id}`: Delete a configuration
- `GET /api/v1/configs/{config_type}/{config_id}/history`: Get configuration history
- `POST /api/v1/configs/{config_type}/{config_id}/archive`: Archive a configuration
- `POST /api/v1/configs/{config_type}/{config_id}/unarchive`: Unarchive a configuration
- `POST /api/v1/configs/{config_type}/{config_id}/clone`: Clone a configuration

### Job Endpoints

- `POST /api/v1/jobs`: Submit a job with multiple configurations
- `GET /api/v1/jobs`: List jobs with optional filtering
- `GET /api/v1/jobs/{job_id}`: Get a specific job
- `POST /api/v1/jobs/{job_id}/cancel`: Cancel a job

## Running the Application

1. Install dependencies:
   ```
   pip install -r backend/requirements.txt
   ```

2. Run the application:
   ```
   python -m backend.main
   ```

## Configuration

The application uses a YAML configuration file at `./config.yaml`. You can specify a different path using the `CONFIG_PATH` environment variable.

Example configuration:

```yaml
app:
  name: c4h-editor
  environment: development

repository:
  path: ./data/repositories

api:
  cors_origins:
    - "*"

c4h_service:
  api_base: https://api.c4h.example.com
  api_version: v1
  api_key_env: C4H_API_KEY
  default_config:
    max_runtime: 3600
    notify_on_completion: true
```

## Environment Variables

- `CONFIG_PATH`: Path to configuration file (default: `./config.yaml`)
- `C4H_API_KEY`: API key for the C4H service
- `ANTHROPIC_API_KEY`: API key for Anthropic (if using Claude LLM)
- `OPENAI_API_KEY`: API key for OpenAI (if using GPT models)

## Adding New Configuration Types

To add a new configuration type:

1. Define the type in a configuration file (e.g., `config_types.json`):

```json
{
  "new_type": {
    "name": "New Type",
    "description": "Description of the new type",
    "supportsVersioning": true,
    "schema": "schemas/new_type.json",
    "repository": {
      "type": "git",
      "path": "repositories/new_type"
    }
  }
}
```

2. Create a JSON schema for validation in `schemas/new_type.json`

3. Load the configuration types in your application:

```python
from backend.config.config_types import load_config_types

# Load with custom config
load_config_types('path/to/config_types.json')
```

## Migration

If you're upgrading from an older version that only supported WorkOrders, you can use the migration script:

```
python -m backend.scripts.migrate_workorders --source ./data/legacy_repo --dest ./data/repositories/workorders --backup
```
""")

print(f"Created {readme_path}")

# Create example config.yaml
config_path = Path("config.yaml.example")
with open(config_path, "w") as f:
    f.write("""# Example configuration for C4H Editor Backend
app:
  name: c4h-editor
  environment: development

repository:
  path: ./data/repositories

api:
  host: 0.0.0.0
  port: 8000
  cors_origins:
    - "*"

llm:
  provider: anthropic
  model: claude-3-opus-20240229
  api_key_env: ANTHROPIC_API_KEY

c4h_service:
  api_base: https://api.c4h.example.com
  api_version: v1
  api_key_env: C4H_API_KEY
  default_config:
    max_runtime: 3600
    notify_on_completion: true

# Configuration types - can also be defined separately
config_types:
  workorder:
    name: Work Orders
    description: Defines what needs to be done and against which asset
    supportsVersioning: true
    schema: schemas/workorder.json
    repository:
      type: git
      path: ./data/repositories/workorders

  teamconfig:
    name: Team Configuration
    description: Defines agent teams and their capabilities
    supportsVersioning: true
    schema: schemas/teamconfig.json
    repository:
      type: git
      path: ./data/repositories/teamconfigs

  runtimeconfig:
    name: Runtime Configuration
    description: Manages operational aspects of the C4H Service
    supportsVersioning: true
    schema: schemas/runtimeconfig.json
    repository:
      type: git
      path: ./data/repositories/runtimeconfigs
""")

print(f"Created {config_path}")

print("README and Example Configuration created successfully.")

# Final summary message
print("""
C4H Backend Refactoring Complete!

The refactoring has transformed the backend to support multiple configuration types
with a unified API. The changes include:

1. Configuration Type Registry
2. Generic Configuration Models
3. Configuration-specific Models (WorkOrder, TeamConfig, RuntimeConfig)
4. Generic Repository Pattern
5. Unified API for all configuration types
6. Updated Job system with multiple configurations
7. Migration utilities and documentation

To complete the migration:

1. Review the generated code for any customizations needed
2. Run the migration script to convert legacy workorders
3. Update any client applications to use the new API

The backend now supports the design requirements from the specification.
""")
