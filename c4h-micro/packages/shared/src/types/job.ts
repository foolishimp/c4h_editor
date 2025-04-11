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

export interface JobConfigReference {
  id: string;
  version?: string;
  config_type: string;
}

export interface JobSubmissionRequest {
  configurations: JobConfigReference[];
  user_id?: string;
  job_configuration?: JobConfiguration;
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

export interface JobListResponse {
  items: Job[];
  total: number;
  limit: number;
  offset: number;
}

export interface JobHistoryEntry {
  timestamp: string;
  event_type: string;
  user_id?: string;
  details: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface JobHistoryResponse {
  job_id: string;
  entries: JobHistoryEntry[];
}