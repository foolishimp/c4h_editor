// File: frontend/src/types/workorder.ts
export enum WorkOrderStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface WorkOrder {
  id: string;
  template: WorkOrderTemplate;
  metadata: WorkOrderMetadata;
  parent_id?: string;
  lineage?: string[];
  status?: WorkOrderStatus;
}

export interface WorkOrderTemplate {
  text: string;
  parameters: WorkOrderParameter[];
  config?: WorkOrderConfig;
}

export interface WorkOrderMetadata {
  author: string;
  created_at: string;
  updated_at: string;
  description?: string;
  tags?: string[];
  target_model?: string;
  version: string;
  asset?: string;
  intent?: string;
  goal?: string;
  priority?: string;
  due_date?: string;
  assignee?: string;
}

export interface WorkOrderParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
}

export interface WorkOrderConfig {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}