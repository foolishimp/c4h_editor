#!/usr/bin/env python3
# migration_script_4.py
#
# This script updates the shared package with:
# 1. Configuration type registry
# 2. Updated API endpoints
# 3. Enhanced Job and Config types

import os
import json
from pathlib import Path

BASE_DIR = Path("c4h-micro")

def create_directory(path):
    if not path.exists():
        print(f"Creating directory: {path}")
        path.mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)

def update_shared_package():
    shared_dir = BASE_DIR / "packages" / "shared"
    shared_src_dir = shared_dir / "src"
    shared_config_dir = shared_src_dir / "config"
    
    # Create config directory if it doesn't exist
    create_directory(shared_config_dir)
    
    # Create config-types.ts
    config_types = """// File: packages/shared/src/config/configTypes.ts
/**
 * Configuration Type Registry
 * 
 * This file defines all supported configuration types and their metadata.
 * New configuration types can be added here without code changes.
 */

export interface ConfigTypeMetadata {
  name: string;
  description: string;
  supportsVersioning: boolean;
  apiEndpoints: {
    list: string;
    get: (id: string) => string;
    create: string;
    update: (id: string) => string;
    delete: (id: string) => string;
    archive: (id: string) => string;
    unarchive: (id: string) => string;
    clone: (id: string) => string;
    history: (id: string) => string;
  };
}

const configTypes: Record<string, ConfigTypeMetadata> = {
  workorder: {
    name: "Work Order",
    description: "Defines what needs to be done and against which asset",
    supportsVersioning: true,
    apiEndpoints: {
      list: "/api/v1/configs/workorder",
      get: (id: string) => `/api/v1/configs/workorder/${id}`,
      create: "/api/v1/configs/workorder",
      update: (id: string) => `/api/v1/configs/workorder/${id}`,
      delete: (id: string) => `/api/v1/configs/workorder/${id}`,
      archive: (id: string) => `/api/v1/configs/workorder/${id}/archive`,
      unarchive: (id: string) => `/api/v1/configs/workorder/${id}/unarchive`,
      clone: (id: string) => `/api/v1/configs/workorder/${id}/clone`,
      history: (id: string) => `/api/v1/configs/workorder/${id}/history`
    }
  },
  teamconfig: {
    name: "Team Configuration",
    description: "Defines the agent teams and their capabilities",
    supportsVersioning: true,
    apiEndpoints: {
      list: "/api/v1/configs/teamconfig",
      get: (id: string) => `/api/v1/configs/teamconfig/${id}`,
      create: "/api/v1/configs/teamconfig",
      update: (id: string) => `/api/v1/configs/teamconfig/${id}`,
      delete: (id: string) => `/api/v1/configs/teamconfig/${id}`,
      archive: (id: string) => `/api/v1/configs/teamconfig/${id}/archive`,
      unarchive: (id: string) => `/api/v1/configs/teamconfig/${id}/unarchive`,
      clone: (id: string) => `/api/v1/configs/teamconfig/${id}/clone`,
      history: (id: string) => `/api/v1/configs/teamconfig/${id}/history`
    }
  },
  runtimeconfig: {
    name: "Runtime Configuration",
    description: "Manages operational aspects of the C4H Service",
    supportsVersioning: true,
    apiEndpoints: {
      list: "/api/v1/configs/runtimeconfig",
      get: (id: string) => `/api/v1/configs/runtimeconfig/${id}`,
      create: "/api/v1/configs/runtimeconfig",
      update: (id: string) => `/api/v1/configs/runtimeconfig/${id}`,
      delete: (id: string) => `/api/v1/configs/runtimeconfig/${id}`,
      archive: (id: string) => `/api/v1/configs/runtimeconfig/${id}/archive`,
      unarchive: (id: string) => `/api/v1/configs/runtimeconfig/${id}/unarchive`,
      clone: (id: string) => `/api/v1/configs/runtimeconfig/${id}/clone`,
      history: (id: string) => `/api/v1/configs/runtimeconfig/${id}/history`
    }
  }
};

// Backward compatibility with existing API endpoints
const backwardCompatibilityAliases = {
  workorders: "workorder"
};

// Export the config types registry
export { configTypes, backwardCompatibilityAliases };
export default configTypes;
"""
    
    write_file(shared_config_dir / "configTypes.ts", config_types)
    
    # Create remotes.ts for Module Federation remotes
    remotes = """// File: packages/shared/src/config/remotes.ts
/**
 * Module Federation Remotes Registry
 * 
 * This file defines the URLs for all remote microfrontends.
 */

export const remotes = {
  yamlEditor: 'http://localhost:3002/assets/remoteEntry.js',
  configSelector: 'http://localhost:3003/assets/remoteEntry.js',
  jobManagement: 'http://localhost:3004/assets/remoteEntry.js'
};

export default remotes;
"""
    
    write_file(shared_config_dir / "remotes.ts", remotes)
    
    # Update api.ts with new endpoints
    api_endpoints = """// File: packages/shared/src/config/api.ts
import axios from 'axios';

// Use process.env for Node.js environment compatibility
// TypeScript doesn't recognize import.meta.env by default
const API_BASE_URL = typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL 
  ? process.env.VITE_API_BASE_URL 
  : 'http://localhost:8000';

// Create an axios instance with the base URL
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Enhanced API endpoints supporting the configuration-driven approach
export const API_ENDPOINTS = {
  // Config endpoints
  CONFIG_TYPES: '/api/v1/config-types',
  CONFIGS: (type: string) => `/api/v1/configs/${type}`,
  CONFIG: (type: string, id: string) => `/api/v1/configs/${type}/${id}`,
  CONFIG_HISTORY: (type: string, id: string) => `/api/v1/configs/${type}/${id}/history`,
  CONFIG_CLONE: (type: string, id: string) => `/api/v1/configs/${type}/${id}/clone`,
  CONFIG_ARCHIVE: (type: string, id: string) => `/api/v1/configs/${type}/${id}/archive`,
  CONFIG_UNARCHIVE: (type: string, id: string) => `/api/v1/configs/${type}/${id}/unarchive`,
  
  // Original workorder endpoints (backward compatibility)
  WORKORDERS: '/api/v1/workorders',
  WORKORDER: (id: string) => `/api/v1/workorders/${id}`,
  WORKORDER_HISTORY: (id: string) => `/api/v1/workorders/${id}/history`,
  WORKORDER_CLONE: (id: string) => `/api/v1/workorders/${id}/clone`,
  WORKORDER_ARCHIVE: (id: string) => `/api/v1/workorders/${id}/archive`,
  WORKORDER_UNARCHIVE: (id: string) => `/api/v1/workorders/${id}/unarchive`, 
  WORKORDER_RENDER: (id: string) => `/api/v1/workorders/${id}/render`,
  WORKORDER_TEST: (id: string) => `/api/v1/workorders/${id}/test`,
   
  // Enhanced job endpoints
  JOBS: '/api/v1/jobs',
  JOB: (id: string) => `/api/v1/jobs/${id}`,
  JOB_CANCEL: (id: string) => `/api/v1/jobs/${id}/cancel`
};

// To make both named and default exports available
export default api;
"""
    
    write_file(shared_config_dir / "api.ts", api_endpoints)
    
    # Update job.ts with enhanced types
    job_ts = """// File: packages/shared/src/types/job.ts
/**
 * Enhanced Job types to support the configuration-driven approach
 */

export enum JobStatus {
  CREATED = "created",
  SUBMITTED = "submitted",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

export interface JobResult {
  output?: string;
  artifacts?: any[];
  metrics?: Record<string, any>;
  error?: string;
}

export interface Job {
  id: string;
  configurations: Record<string, { id: string, version: string } | string>;
  status: JobStatus;
  serviceJobId?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  completedAt?: string;
  userId?: string;
  configuration?: Record<string, any>; // Deprecated, for backward compatibility
  result?: JobResult;
}
"""
    
    write_file(shared_src_dir / "types" / "job.ts", job_ts)
    
    # Create config.ts for the new configuration type
    config_ts = """// File: packages/shared/src/types/config.ts
/**
 * Generic Configuration types
 */

export interface ConfigMetadata {
  author: string;
  archived?: boolean;
  created_at: string;
  updated_at: string;
  description?: string;
  tags: string[];
  version: string;
}

export interface ConfigVersionInfo {
  version: string;
  commit_hash: string;
  created_at: string;
  author: string;
  message: string;
}

export interface Config {
  id: string;
  config_type: string;
  content: Record<string, any>;
  metadata: ConfigMetadata;
  parent_id?: string;
  lineage: string[];
}

export interface ConfigHistoryResponse {
  config_id: string;
  config_type: string;
  versions: ConfigVersionInfo[];
}

// Export editor tab types for backward compatibility
export enum EditorTab {
  INTENT = 'intent',
  SYSTEM = 'system'
}

export interface TabMetadata {
  title: string;
  description: string;
  schemaExample: Record<string, any>;
}

// Export config section types for backward compatibility
export enum ConfigSection {
  PROJECT = 'project',
  INTENT = 'intent',
  LLM_CONFIG = 'llm_config',
  ORCHESTRATION = 'orchestration',
  RUNTIME = 'runtime',
  BACKUP = 'backup',
  LOGGING = 'logging'
}

// Maps UI tabs to specific config sections they edit (backward compatibility)
export const TAB_SECTIONS: Record<EditorTab, ConfigSection[]> = {
  [EditorTab.INTENT]: [ConfigSection.INTENT],
  [EditorTab.SYSTEM]: [
    ConfigSection.PROJECT,
    ConfigSection.LLM_CONFIG,
    ConfigSection.ORCHESTRATION,
    ConfigSection.RUNTIME,
    ConfigSection.BACKUP,
    ConfigSection.LOGGING
  ]
};
"""
    
    write_file(shared_src_dir / "types" / "config.ts", config_ts)
    
    # Update index.ts to export all new types
    index_ts = """// File: packages/shared/src/index.ts
/**
 * Main entry point for shared package
 * Exports all shared types, utilities, and components
 */

// Export shared types
export * from './types/workorder';
export * from './types/job';
export * from './types/config';

// Export config registry
export * from './config/configTypes';
export * from './config/remotes';

// Export utils
export { default as eventBus } from './utils/eventBus';

// Export shared components
export { default as TimeAgo } from './components/TimeAgo';
export { default as DiffViewer } from './components/DiffViewer';

// Export API config
export { default as api, API_ENDPOINTS } from './config/api';
"""
    
    write_file(shared_src_dir / "index.ts", index_ts)
    
    print("Shared package updated with configuration registry!")

if __name__ == "__main__":
    update_shared_package()