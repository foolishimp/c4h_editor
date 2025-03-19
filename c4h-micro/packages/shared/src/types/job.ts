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

export interface Job {
  id: string;
  configurations: Record<string, { id: string, version: string } | string>;
  status: JobStatus;
  serviceJobId?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  completedAt?: string;
  userId?: string;
  configuration?: Record<string, any>; // Deprecated, for backward compatibility
  result?: JobResult;
}
