import { WorkOrder } from './workorder';

export enum JobStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  TIMED_OUT = 'timed_out',
}

export interface JobStats {
  startTime?: string;
  endTime?: string;
  duration?: number;
  progress?: number;
  resourceUsage?: {
    cpu?: number;
    memory?: number;
    gpu?: number;
  };
}

export interface JobError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface JobResult {
  metadata: Record<string, any>;
  outputs: Record<string, any>;
  artifacts?: string[]; // URLs to generated artifacts
}

export interface Job {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  status: JobStatus;
  submitTime: string;
  parameters?: Record<string, any>;
  stats?: JobStats;
  errors?: JobError[];
  results?: JobResult;
  logs?: string;
}

export interface JobCreateRequest {
  workOrderId: string;
  parameters?: Record<string, any>;
}

export interface JobUpdateRequest {
  status?: JobStatus;
}