# C4H Editor Backend

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
