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
  goal?: string;
  priority?: string;
  due_date?: string | null;
  assignee?: string;
  asset?: string;
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

// WorkOrder specific types for backward compatibility
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

// TeamConfig specific types
export interface RoleConfig {
  name: string;
  description?: string;
  capabilities: string[];
  model?: string;
  config: Record<string, any>;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  description?: string;
  config: Record<string, any>;
}

export interface TeamDefinition {
  name: string;
  description?: string;
  agents: AgentConfig[];
  workflow?: Record<string, any>;
}

export interface TeamConfigContent {
  roles: RoleConfig[];
  teams: TeamDefinition[];
  default_team?: string;
  global_config: Record<string, any>;
}

// Legacy TeamConfig types for backward compatibility
export interface LLMConfig {
  providers: ProviderConfig[];
  default_provider: string;
  default_model: string;
}

export interface ProviderConfig {
  name: string;
  api_key?: string;
  models: string[];
  endpoint?: string;
}

export interface OrchestrationConfig {
  enabled: boolean;
  teams: TeamDefinition[];
}

// RuntimeConfig specific types
export interface LineageConfig {
  enabled: boolean;
  namespace: string;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warning' | 'error';
  format: 'json' | 'text';
  agent_level?: 'debug' | 'info' | 'warning' | 'error';
}

export interface BackupConfig {
  enabled: boolean;
  path: string;
}