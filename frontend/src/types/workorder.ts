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

export enum ParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object'
}

export interface WorkOrderParameter {
  name: string;
  description: string;
  type: ParameterType;
  required: boolean;
  default?: any;
}

export interface WorkOrderVersion {
  id: string;
  workorder_id: string;
  version_number: string;
  content: string;
  parameters: WorkOrderParameter[];
  metadata: WorkOrderMetadata;
  created_at: string; // Use string instead of Date
  author: string;
}

export interface WorkOrderDiff {
  content_diff: string;
  parameters_diff: string;
  metadata_diff: string;
}

export interface WorkOrderConfig {
  temperature: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
  service_id?: string;
  workflow_id?: string;
  max_runtime?: number;
  notify_on_completion?: boolean;
  parameters?: Record<string, any>;
}

export interface WorkOrderUI {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: WorkOrderStatus;
  config: WorkOrderConfig;
  tags?: string[];
  promptId?: string;
}

export function convertToWorkOrderUI(workOrder: WorkOrder): WorkOrderUI {
  return {
    id: workOrder.id,
    name: workOrder.metadata.description || workOrder.id,
    description: workOrder.metadata.description || '',
    createdAt: workOrder.metadata.created_at || new Date().toISOString(),
    updatedAt: workOrder.metadata.updated_at || new Date().toISOString(),
    createdBy: workOrder.metadata.author || 'Unknown',
    status: WorkOrderStatus.DRAFT,
    config: workOrder.template.config,
    tags: workOrder.metadata.tags || [],
    promptId: workOrder.parent_id
  };
}

export function convertToWorkOrder(workOrderUI: WorkOrderUI): WorkOrder {
  return {
    id: workOrderUI.id,
    template: {
      text: '',  // This needs to be filled in as needed
      parameters: [],
      config: workOrderUI.config
    },
    metadata: {
      author: workOrderUI.createdBy,
      description: workOrderUI.description,
      tags: workOrderUI.tags,
      created_at: workOrderUI.createdAt,
      updated_at: workOrderUI.updatedAt
    }
  };
}