export enum WorkOrderStatus {
  DRAFT = 'draft',
  READY = 'ready',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum WorkOrderType {
  STANDARD = 'standard',
  BATCH = 'batch',
  CUSTOM = 'custom',
}

export interface ParameterType {
  STRING: 'string';
  NUMBER: 'number';
  BOOLEAN: 'boolean';
  ARRAY: 'array';
  OBJECT: 'object';
}

export interface WorkOrderMetadata {
  author: string;
  created_at: string;
  updated_at: string;
  description?: string;
  tags: string[];
  target_model?: string;
  version: string;
  // Extended metadata for work orders
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
  default?: any;
  required: boolean;
}

export interface WorkOrderConfig {
  version: string;
  type: WorkOrderType;
  resources?: {
    cpu?: string;
    memory?: string;
    gpu?: string;
  };
  timeout?: number;
  retry?: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
  parameters?: Record<string, any>;
  environment?: Record<string, string>;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  // Core LLM configuration
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
  // C4H service configuration
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
  template: WorkOrderTemplate;
  metadata: WorkOrderMetadata;
  parent_id?: string;
  lineage: string[];
}

// Legacy interfaces maintained for compatibility
export interface WorkOrderListItem {
  id: string;
  version: string;
  title: string;
  author: string;
  updated_at: string;
  last_commit: string;
  last_commit_message: string;
}

export interface WorkOrderVersion {
  workorder_id: string;
  version: string;
  commit_hash: string;
  created_at: string;
  author: string;
  message: string;
  workorder: WorkOrder;
}

export interface WorkOrderTestCase {
  name: string;
  parameters: Record<string, any>;
  expected_output?: string;
  tags?: string[];
}

export interface WorkOrderCreateRequest {
  name: string;
  description?: string;
  promptId?: string;
  config: WorkOrderConfig | string; // Can be an object or YAML string
  tags?: string[];
}

export interface WorkOrderUpdateRequest {
  name?: string;
  description?: string;
  promptId?: string;
  config?: WorkOrderConfig | string; // Can be an object or YAML string
  tags?: string[];
  status?: WorkOrderStatus;
}