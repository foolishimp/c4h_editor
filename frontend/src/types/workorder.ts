// File: frontend/src/types/workorder.ts
// Updated to include extended metadata properties

// Add the ParameterType enum that's referenced but missing
export enum ParameterType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  ARRAY = "array",
  OBJECT = "object"
}

export interface WorkOrderParameter {
  name: string;
  type: ParameterType;
  description?: string;
  required: boolean;
  default?: any;
}

export interface WorkOrderMetadata {
  author: string;
  archived?: boolean;
  created_at: string;
  updated_at: string;
  description?: string;
  tags: string[];
  version: string;
  // Added missing properties to support new UI requirements
  goal?: string;
  priority?: string;
  due_date?: string;
  assignee?: string;
  asset?: string;
  target_model?: string;
}

export interface WorkOrderConfig {
  temperature: number;
  max_tokens?: number;
  service_id?: string;
  workflow_id?: string;
  max_runtime?: number;
  notify_on_completion?: boolean;
  parameters?: Record<string, any>;
}

export interface WorkOrderTemplate {
  text: string;
  parameters: WorkOrderParameter[];
  config: WorkOrderConfig;
}

export interface WorkOrder {
  id: string;
  template: WorkOrderTemplate;
  metadata: WorkOrderMetadata;
  parent_id?: string;
  lineage: string[];
}

export interface WorkOrderVersionInfo {
  version: string;
  commit_hash: string;
  created_at: string;
  author: string;
  message: string;
}

export interface WorkOrderHistoryResponse {
  workorder_id: string;
  versions: WorkOrderVersionInfo[];
}