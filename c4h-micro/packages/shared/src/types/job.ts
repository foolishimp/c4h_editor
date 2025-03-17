// File: c4h-editor-micro/packages/shared/src/types/job.ts
// Migrated from original frontend

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
  workOrderId: string; // This is the correct property name in the type
  workOrderVersion: string;
  status: JobStatus;
  serviceJobId?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  completedAt?: string;
  userId?: string;
  configuration: Record<string, any>;
  results?: JobResult; // This is the correct property in the type
}