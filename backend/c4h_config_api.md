# C4H Config Service API Documentation

## Overview

The C4H Config Service API provides a configuration-driven approach for managing multiple configuration types (WorkOrder, TeamConfig, RuntimeConfig) through a unified interface. The API supports versioning, metadata, and job management with multiple configurations.

## Base URL

```
http://localhost:8000
```

## Authentication

API uses bearer token authentication.

```
Authorization: Bearer <api_key>
```

## Data Models

### Configuration

```typescript
interface Configuration {
  id: string;
  config_type: string;
  content: Record<string, any>;
  metadata: {
    author: string;
    archived: boolean;
    created_at: string;
    updated_at: string;
    description?: string;
    tags: string[];
    version: string;
  };
  parent_id?: string;
  lineage: string[];
}
```

### Job

```typescript
interface Job {
  id: string;
  configurations: Record<string, { id: string, version: string }>;
  status: "created" | "submitted" | "running" | "completed" | "failed" | "cancelled";
  service_job_id?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  completed_at?: string;
  user_id?: string;
  job_configuration: Record<string, any>;
  result?: {
    output?: string;
    artifacts: any[];
    metrics: Record<string, any>;
    error?: string;
  };
}
```

## API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "version": "0.2.0",
  "config_loaded": true,
  "services": {
    "repository": true,
    "jobs": true,
    "c4h": true
  },
  "supported_config_types": ["workorder", "teamconfig", "runtimeconfig"]
}
```

### Configuration Types

```
GET /api/v1/config-types
```

Response:
```json
[
  {
    "type": "workorder",
    "name": "Work Order",
    "description": "Defines what needs to be done and against which asset",
    "supportsVersioning": true
  },
  {
    "type": "teamconfig",
    "name": "Team Configuration",
    "description": "Defines the agent teams and their capabilities",
    "supportsVersioning": true
  },
  {
    "type": "runtimeconfig",
    "name": "Runtime Configuration",
    "description": "Manages operational aspects of the C4H Service",
    "supportsVersioning": true
  }
]
```

### Configuration Management

#### List Configurations

```
GET /api/v1/configs/{configType}
```

Parameters:
- `configType`: The type of configuration (e.g., "workorder")
- `archived` (optional): Filter by archived status (true/false)

Response:
```json
[
  {
    "id": "config-id",
    "version": "1.0.0",
    "title": "Description of the configuration",
    "author": "author-name",
    "updated_at": "2023-01-01T00:00:00.000000",
    "last_commit": "commit-hash",
    "last_commit_message": "Commit message",
    "config_type": "workorder"
  }
]
```

#### Get Configuration

```
GET /api/v1/configs/{configType}/{configId}
```

Parameters:
- `configType`: The type of configuration
- `configId`: The identifier of the configuration
- `version` (optional): Specific version or commit hash to retrieve

Response:
```json
{
  "id": "config-id",
  "config_type": "workorder",
  "version": "1.0.0",
  "content": {
    // Configuration content specific to the type
  },
  "metadata": {
    "author": "author-name",
    "archived": false,
    "created_at": "2023-01-01T00:00:00.000000",
    "updated_at": "2023-01-01T00:00:00.000000",
    "description": "Configuration description",
    "tags": ["tag1", "tag2"]
  },
  "commit": "commit-hash",
  "updated_at": "2023-01-01T00:00:00.000000"
}
```

#### Create Configuration

```
POST /api/v1/configs/{configType}
```

Request:
```json
{
  "id": "new-config-id",
  "content": {
    // Configuration content specific to the type
  },
  "metadata": {
    "author": "author-name",
    "description": "Configuration description",
    "tags": ["tag1", "tag2"]
  },
  "commit_message": "Initial commit",
  "author": "author-name"
}
```

Response: Same format as Get Configuration

#### Update Configuration

```
PUT /api/v1/configs/{configType}/{configId}
```

Request:
```json
{
  "content": {
    // Updated configuration content
  },
  "metadata": {
    "author": "author-name",
    "description": "Updated description",
    "tags": ["tag1", "tag2"]
  },
  "commit_message": "Update configuration",
  "author": "author-name"
}
```

Response: Same format as Get Configuration

#### Delete Configuration

```
DELETE /api/v1/configs/{configType}/{configId}?commit_message={message}&author={author}
```

Response:
```json
{
  "message": "Configuration config-id deleted successfully"
}
```

#### Get Configuration History

```
GET /api/v1/configs/{configType}/{configId}/history
```

Response:
```json
{
  "config_id": "config-id",
  "config_type": "workorder",
  "versions": [
    {
      "version": "1.0.0",
      "commit_hash": "commit-hash",
      "created_at": "2023-01-01T00:00:00.000000",
      "author": "author-name",
      "message": "Commit message"
    }
  ]
}
```

#### Archive/Unarchive Configuration

```
POST /api/v1/configs/{configType}/{configId}/archive?author={author}
POST /api/v1/configs/{configType}/{configId}/unarchive?author={author}
```

Response:
```json
{
  "message": "Configuration config-id archived/unarchived successfully"
}
```

#### Clone Configuration

```
POST /api/v1/configs/{configType}/{configId}/clone?new_id={newId}&author={author}
```

Response: Same format as Get Configuration

### Job Management

#### List Jobs

```
GET /api/v1/jobs
```

Parameters:
- `config_type` (optional): Filter by configuration type
- `config_id` (optional): Filter by configuration ID
- `status` (optional): Filter by status
- `user_id` (optional): Filter by user ID
- `limit` (optional): Page size limit (default: 100)
- `offset` (optional): Page offset (default: 0)

Response:
```json
{
  "items": [
    {
      "id": "job-id",
      "configurations": {
        "workorder": { "id": "workorder-id", "version": "1.0.0" },
        "teamconfig": { "id": "teamconfig-id", "version": "1.0.0" },
        "runtimeconfig": { "id": "runtimeconfig-id", "version": "1.0.0" }
      },
      "status": "running",
      "service_job_id": "service-job-id",
      "created_at": "2023-01-01T00:00:00.000000",
      "updated_at": "2023-01-01T00:00:00.000000"
    }
  ],
  "total": 10,
  "limit": 100,
  "offset": 0
}
```

#### Get Job

```
GET /api/v1/jobs/{jobId}
```

Response:
```json
{
  "id": "job-id",
  "configurations": {
    "workorder": { "id": "workorder-id", "version": "1.0.0" },
    "teamconfig": { "id": "teamconfig-id", "version": "1.0.0" },
    "runtimeconfig": { "id": "runtimeconfig-id", "version": "1.0.0" }
  },
  "status": "running",
  "service_job_id": "service-job-id",
  "created_at": "2023-01-01T00:00:00.000000",
  "updated_at": "2023-01-01T00:00:00.000000",
  "submitted_at": "2023-01-01T00:00:30.000000",
  "completed_at": null,
  "user_id": "user-id",
  "job_configuration": {
    "max_runtime": 3600,
    "notify_on_completion": true
  },
  "result": null
}
```

#### Submit Job

```
POST /api/v1/jobs
```

Request:
```json
{
  "configurations": {
    "workorder": {"id": "workorder-id", "version": "1.0.0"},
    "teamconfig": {"id": "teamconfig-id"},
    "runtimeconfig": {"id": "runtimeconfig-id"}
  },
  "user_id": "user-id",
  "job_configuration": {
    "max_runtime": 3600,
    "notify_on_completion": true
  }
}
```

Response: Same format as Get Job

#### Cancel Job

```
POST /api/v1/jobs/{jobId}/cancel
```

Response: Same format as Get Job

## Error Handling

All endpoints return standard HTTP status codes with error details:

```json
{
  "detail": "Error message",
  "config_type": "workorder",
  "validation_errors": [
    {
      "field": "field_name",
      "message": "Specific validation error"
    }
  ]
}
```

## Type-Specific Content Schemas

### WorkOrder Content

```typescript
interface WorkOrderContent {
  template: {
    text: string;
    parameters: Array<{
      name: string;
      type: "string" | "number" | "boolean" | "array" | "object";
      description?: string;
      default?: any;
      required: boolean;
    }>;
    config: {
      temperature: number;
      max_tokens?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      stop_sequences: string[];
      service_id?: string;
      workflow_id?: string;
      max_runtime?: number;
      notify_on_completion: boolean;
      parameters: Record<string, any>;
    }
  }
}
```

### TeamConfig Content

```typescript
interface TeamConfigContent {
  roles: Array<{
    name: string;
    description?: string;
    capabilities: string[];
    model?: string;
    config: Record<string, any>;
  }>;
  teams: Array<{
    name: string;
    description?: string;
    agents: Array<{
      id: string;
      name: string;
      role: string;
      description?: string;
      config: Record<string, any>;
    }>;
    workflow?: Record<string, any>;
  }>;
  default_team?: string;
  global_config: Record<string, any>;
}
```

### RuntimeConfig Content

```typescript
interface RuntimeConfigContent {
  resource_limits: {
    max_tokens?: number;
    max_runtime?: number;
    max_concurrent_jobs?: number;
    token_bucket_size?: number;
    token_refill_rate?: number;
  };
  notifications: {
    enabled: boolean;
    on_completion: boolean;
    on_failure: boolean;
    channels: string[];
    webhook_url?: string;
  };
  models: Record<string, {
    provider: string;
    model_id: string;
    version?: string;
    parameters: Record<string, any>;
    enabled: boolean;
  }>;
  default_model?: string;
  environment_variables: Record<string, string>;
  feature_flags: Record<string, boolean>;
}
```