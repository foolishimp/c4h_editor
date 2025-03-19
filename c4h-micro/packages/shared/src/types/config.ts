// File: packages/shared/src/types/config.ts
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
