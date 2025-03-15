// File: frontend/src/types/workorder.ts (Partial file - add this if missing)

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
}

// Add these fields to match your model enhancements
// Optional for backward compatibility
export interface WorkOrderExtendedMetadata extends WorkOrderMetadata {
  goal?: string;
  priority?: string;
  due_date?: string;
  assignee?: string;
  asset?: string;
}

export interface WorkOrderConfig {
  temperature: number;
  max_tokens?: number;
  service_id?: string;
  workflow_id?: string;
  max_runtime?: number;
  notify_on_completion?: boolean;
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