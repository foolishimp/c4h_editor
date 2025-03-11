import { Prompt } from './prompt';

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
  parameters?: WorkOrderParameter[];
  environment?: Record<string, string>;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
}

export interface WorkOrder {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: WorkOrderStatus;
  promptId?: string;
  prompt?: Prompt;
  config: WorkOrderConfig;
  yamlConfig?: string; // The YAML representation of the config
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