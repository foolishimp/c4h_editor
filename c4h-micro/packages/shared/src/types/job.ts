// File: packages/shared/src/types/job.ts
/**
 * Enhanced Job types to support the configuration-driven approach
 */

export enum JobStatus {
  CREATED = "created",
  SUBMITTED = "submitted",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

export interface JobResult {
  output?: string;
  artifacts?: any[];
  metrics?: Record<string, any>;
  error?: string;
}

export interface JobConfiguration {
  max_runtime?: number;
  notify_on_completion?: boolean;
  priority?: 'low' | 'normal' | 'high';
  callback_url?: string;
  [key: string]: any;
}

export interface JobConfigReference {
  id: string;
  version: string;
}

export interface Job {
  id: string;
  configurations: Record<string, JobConfigReference>;
  status: JobStatus;
  serviceJobId?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  completedAt?: string;
  userId?: string;
  jobConfiguration: JobConfiguration;
  result?: JobResult;
}

// Legacy types for backward compatibility
export interface LegacyJob {
  id: string;
  workOrderId: string;
  workOrderVersion?: string;
  status: JobStatus;
  serviceJobId?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  completedAt?: string;
  userId?: string;
  configuration?: Record<string, any>;
  results?: JobResult;
}

export interface JobSubmitRequest {
  configurations: Record<string, string>;
  user_id?: string;
  job_configuration?: JobConfiguration;
}