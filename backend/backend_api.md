# C4H Editor Backend API Reference

## Overview

The C4H Editor Backend is a REST API service for managing workorders, prompts, and jobs for code refactoring using LLM-powered agents. The API allows creating, updating, testing, and submitting workorders to the C4H service for processing.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently the API does not implement authentication directly. The backend uses API keys for third-party services (LLM providers and C4H service) stored in environment variables.

## API Endpoints

### Health Check

```
GET /health
```

Returns status information about the service.

#### Response

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "config_loaded": true,
  "services": {
    "repository": true,
    "lineage": true,
    "llm": true,
    "jobs": true,
    "c4h": true
  }
}
```

### WorkOrders

WorkOrders are the primary objects for defining code refactoring tasks.

#### List WorkOrders

```
GET /api/v1/workorders
```

Returns a list of all workorders.

#### Response

```json
[
  {
    "id": "workorder-id",
    "version": "1.0.0",
    "title": "Description of the workorder",
    "author": "author-name",
    "updated_at": "2023-01-01T00:00:00.000000",
    "last_commit": "commit-hash",
    "last_commit_message": "Commit message"
  }
]
```

#### Get WorkOrder

```
GET /api/v1/workorders/{workorder_id}
```

Parameters:
- `version` (optional): Specific version or commit hash to retrieve

#### Response

```json
{
  "id": "workorder-id",
  "version": "1.0.0",
  "template": {
    "text": "WorkOrder template with {param1}",
    "parameters": [
      {
        "name": "param1",
        "type": "string",
        "description": "Parameter description",
        "default": "default value",
        "required": true
      }
    ],
    "config": {
      "temperature": 0.7,
      "max_tokens": 1000,
      "service_id": "service-id",
      "workflow_id": "workflow-id",
      "max_runtime": 3600,
      "notify_on_completion": false,
      "parameters": {}
    }
  },
  "metadata": {
    "author": "author-name",
    "archived": false,
    "created_at": "2023-01-01T00:00:00.000000",
    "updated_at": "2023-01-01T00:00:00.000000",
    "description": "WorkOrder description",
    "tags": ["tag1", "tag2"],
    "target_model": "claude-3-opus-20240229",
    "version": "1.0.0",
    "asset": "asset-name",
    "intent": "User's intent",
    "goal": "WorkOrder goal",
    "priority": "high",
    "assignee": "assignee-name"
  },
  "commit": "commit-hash",
  "updated_at": "2023-01-01T00:00:00.000000"
}
```

#### Create WorkOrder

```
POST /api/v1/workorders
```

Request Body:

```json
{
  "id": "new-workorder-id",
  "template": {
    "text": "WorkOrder template with {param1}",
    "parameters": [
      {
        "name": "param1",
        "type": "string",
        "description": "Parameter description",
        "default": "default value",
        "required": true
      }
    ],
    "config": {
      "temperature": 0.7,
      "max_tokens": 1000
    }
  },
  "metadata": {
    "author": "author-name",
    "description": "WorkOrder description",
    "tags": ["tag1", "tag2"]
  },
  "commit_message": "Initial commit",
  "author": "author-name"
}
```

#### Update WorkOrder

```
PUT /api/v1/workorders/{workorder_id}
```

Request Body:

```json
{
  "template": {
    "text": "Updated workorder template with {param1}",
    "parameters": [
      {
        "name": "param1",
        "type": "string",
        "description": "Parameter description",
        "default": "default value",
        "required": true
      }
    ],
    "config": {
      "temperature": 0.7,
      "max_tokens": 1000
    }
  },
  "metadata": {
    "author": "author-name",
    "description": "Updated description",
    "tags": ["tag1", "tag2"]
  },
  "commit_message": "Update workorder",
  "author": "author-name"
}
```

#### Delete WorkOrder

```
DELETE /api/v1/workorders/{workorder_id}?commit_message={message}&author={author}
```

Parameters:
- `commit_message`: Commit message for the deletion
- `author`: Author of the commit

#### Get WorkOrder History

```
GET /api/v1/workorders/{workorder_id}/history
```

Returns the version history of a workorder.

#### Archive/Unarchive WorkOrder

```
POST /api/v1/workorders/{workorder_id}/archive
POST /api/v1/workorders/{workorder_id}/unarchive
```

Marks a workorder as archived or unarchived.

#### Clone WorkOrder

```
POST /api/v1/workorders/{workorder_id}/clone
```

Request Body (optional):
```json
{
  "new_id": "cloned-workorder-id"
}
```

Creates a new workorder based on an existing one.

### Jobs

Jobs represent submissions of workorders to the C4H service.

#### Submit Job

```
POST /api/v1/jobs
```

Request Body:

```json
{
  "work_order_id": "workorder-id",
  "user_id": "user-id",
  "configuration": {
    "max_runtime": 3600,
    "notify_on_completion": true
  }
}
```

#### Response

```json
{
  "id": "job-id",
  "work_order_id": "workorder-id",
  "work_order_version": "1.0.0",
  "status": "created",
  "service_job_id": null,
  "created_at": "2023-01-01T00:00:00.000000",
  "updated_at": "2023-01-01T00:00:00.000000",
  "submitted_at": null,
  "completed_at": null,
  "user_id": "user-id",
  "configuration": {
    "max_runtime": 3600,
    "notify_on_completion": true
  },
  "result": null
}
```

#### List Jobs

```
GET /api/v1/jobs
```

Parameters:
- `work_order_id` (optional): Filter by workorder ID
- `status` (optional): Filter by status
- `user_id` (optional): Filter by user ID
- `limit` (optional): Page size limit (default: 100)
- `offset` (optional): Page offset (default: 0)

#### Get Job

```
GET /api/v1/jobs/{job_id}
```

Returns status and details of a specific job.

#### Cancel Job

```
POST /api/v1/jobs/{job_id}/cancel
```

Cancels a running job.

## Data Models

### WorkOrder

The main data structure for defining refactoring tasks.

```typescript
interface WorkOrder {
  id: string;
  template: {
    text: string;
    parameters: [{
      name: string;
      type: "string" | "number" | "boolean" | "array" | "object";
      description?: string;
      default?: any;
      required: boolean;
    }];
    config: {
      temperature: number;
      max_tokens?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      stop_sequences?: string[];
      service_id?: string;
      workflow_id?: string;
      max_runtime?: number;
      notify_on_completion: boolean;
      parameters: Record<string, any>;
    }
  };
  metadata: {
    author: string;
    archived: boolean;
    created_at: string;
    updated_at: string;
    description?: string;
    tags: string[];
    target_model?: string;
    version: string;
    asset?: string;
    intent?: string;
    goal?: string;
    priority?: string;
    due_date?: string;
    assignee?: string;
  };
  parent_id?: string;
  lineage: string[];
}
```

### Job

Represents a submitted workorder to the C4H service.

```typescript
interface Job {
  id: string;
  work_order_id: string;
  work_order_version: string;
  status: "created" | "submitted" | "running" | "completed" | "failed" | "cancelled";
  service_job_id?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  completed_at?: string;
  user_id?: string;
  configuration: Record<string, any>;
  result?: {
    output?: string;
    artifacts: any[];
    metrics: Record<string, any>;
    error?: string;
  };
}
```

## Error Handling

All API endpoints return standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid input or parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

Error responses include a detail message:

```json
{
  "detail": "Error message"
}
```

## Workflow Examples

### Creating and Submitting a WorkOrder

1. Create a new workorder:
   ```
   POST /api/v1/workorders
   ```

2. Submit the workorder as a job:
   ```
   POST /api/v1/jobs
   ```

3. Monitor job status:
   ```
   GET /api/v1/jobs/{job_id}
   ```

## Integration Notes

- The backend connects to the C4H service API to submit and track jobs
- WorkOrders support templating with parameters
- WorkOrder history and versioning is handled through Git
- Lineage tracking is available for auditing and debugging

## Environment Variables

Key environment variables needed by the service:

- `ANTHROPIC_API_KEY`: API key for Anthropic (Claude)
- `OPENAI_API_KEY`: API key for OpenAI
- `C4H_API_KEY`: API key for the C4H service
- `CONFIG_PATH`: Path to configuration YAML (optional)