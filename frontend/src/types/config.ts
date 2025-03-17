/**
 * File: frontend/src/types/config.ts
 * Unified configuration types for work orders
 */

import { WorkOrderParameter } from './workorder';

// Root configuration sections
export enum ConfigSection {
  PROJECT = 'project',
  INTENT = 'intent',
  LLM_CONFIG = 'llm_config',
  ORCHESTRATION = 'orchestration',
  RUNTIME = 'runtime',
  BACKUP = 'backup',
  LOGGING = 'logging'
}

// Maps UI tabs to specific config sections they edit
export enum EditorTab {
  INTENT = 'intent',
  SYSTEM = 'system'
}

// Tab to sections mapping
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

// Full unified configuration type
export interface UnifiedConfig {
  // Project settings
  project?: {
    path?: string;
    workspace_root?: string;
    source_root?: string;
    output_root?: string;
    config_root?: string;
  };

  // Intent (work order description)
  intent?: {
    description?: string;
    target_files?: string[];
  };

  // LLM configuration
  llm_config?: {
    providers?: Record<string, any>;
    default_provider?: string;
    default_model?: string;
    agents?: Record<string, any>;
  };

  // Orchestration configuration
  orchestration?: {
    enabled?: boolean;
    entry_team?: string;
    teams?: Record<string, any>;
    error_handling?: {
      retry_teams?: boolean;
      max_retries?: number;
      log_level?: string;
    };
  };

  // Runtime configuration
  runtime?: {
    workflow?: {
      storage?: Record<string, any>;
    };
    lineage?: Record<string, any>;
  };

  // Backup configuration
  backup?: {
    enabled?: boolean;
    path?: string;
  };

  // Logging configuration
  logging?: {
    level?: string;
    format?: string;
    agent_level?: string;
    providers?: Record<string, any>;
    truncate?: Record<string, any>;
  };
}

// Interface for tab-specific metadata (title, description, etc.)
export interface TabMetadata {
  title: string;
  description: string;
  schemaExample: Record<string, any>;
}

// Interface for the intent configuration handled by IntentConfigTab
export interface IntentTabConfig {
  description?: string;
  target_files?: string[];
  goals?: string;
  priority?: string;
  due_date?: string | null;
  assignee?: string;
  parameters?: WorkOrderParameter[];
}

// Interface for the system configuration handled by SystemConfigTab
export interface SystemTabConfig {
  project?: Record<string, any>;
  llm_config?: Record<string, any>;
  orchestration?: Record<string, any>;
  runtime?: Record<string, any>;
  backup?: Record<string, any>;
  logging?: Record<string, any>;
}