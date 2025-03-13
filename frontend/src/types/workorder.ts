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
  created_at: string;
  updated_at: string;
  description?: string;
  tags: string[];
  version: string;
}

export interface WorkOrderConfig {
  temperature: number;
  max_tokens?: number;
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