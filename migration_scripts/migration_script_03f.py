#!/usr/bin/env python3
# migration_script_03f.py
#
# This script creates the JobContext component

import os
from pathlib import Path

BASE_DIR = Path("c4h-micro")

def create_directory(path):
    if not path.exists():
        print(f"Creating directory: {path}")
        path.mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)

def create_job_context():
    job_management_dir = BASE_DIR / "packages" / "job-management"
    contexts_dir = job_management_dir / "src" / "contexts"
    create_directory(contexts_dir)
    
    # Create JobContext.tsx
    job_context = """// File: packages/job-management/src/contexts/JobContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api } from 'shared';
import { Job, JobStatus } from 'shared';

// Context state interface
interface JobContextState {
  jobs: Job[];
  job: Job | null;
  loading: boolean;
  error: string | null;
  
  loadJobs: () => Promise<void>;
  loadJob: (id: string) => Promise<void>;
  submitJob: (configs: Record<string, string>) => Promise<void>;
  cancelJob: (id: string) => Promise<void>;
  pollJobStatus: (id: string) => Promise<void>;
}

// Create the context
const JobContext = createContext<JobContextState | undefined>(undefined);

// Provider props
interface JobProviderProps {
  children: ReactNode;
}

// Provider component
export const JobProvider: React.FC<JobProviderProps> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load all jobs
  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/v1/jobs');
      
      // Map response to Job type
      const jobsData = response.data.items.map((item: any) => ({
        id: item.id,
        configurations: item.configurations || {},
        status: item.status,
        serviceJobId: item.service_job_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        submittedAt: item.submitted_at,
        completedAt: item.completed_at,
        userId: item.user_id,
        result: item.result
      }));
      
      setJobs(jobsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load a specific job
  const loadJob = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/v1/jobs/${id}`);
      
      // Map response to Job type
      const jobData = {
        id: response.data.id,
        configurations: response.data.configurations || {},
        status: response.data.status,
        serviceJobId: response.data.service_job_id,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        submittedAt: response.data.submitted_at,
        completedAt: response.data.completed_at,
        userId: response.data.user_id,
        result: response.data.result
      };
      
      setJob(jobData);
    } catch (err: any) {
      setError(err.message || `Failed to load job: ${id}`);
      console.error('Error loading job:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Submit a new job
  const submitJob = useCallback(async (configs: Record<string, string>) => {
    setLoading(true);
    setError(null);
    
    try {
      const requestData = {
        configurations: configs,
        user_id: 'current-user', // This would come from auth context in a real app
        job_configuration: {
          max_runtime: 3600,
          notify_on_completion: true
        }
      };
      
      await api.post('/api/v1/jobs', requestData);
      
      // Reload jobs after submission
      await loadJobs();
    } catch (err: any) {
      setError(err.message || 'Failed to submit job');
      console.error('Error submitting job:', err);
    } finally {
      setLoading(false);
    }
  }, [loadJobs]);
  
  // Cancel a job
  const cancelJob = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await api.post(`/api/v1/jobs/${id}/cancel`);
      
      // Reload jobs after cancellation
      await loadJobs();
      
      // Reload the specific job if it's currently loaded
      if (job && job.id === id) {
        await loadJob(id);
      }
    } catch (err: any) {
      setError(err.message || `Failed to cancel job: ${id}`);
      console.error('Error cancelling job:', err);
    } finally {
      setLoading(false);
    }
  }, [job, loadJobs, loadJob]);
  
  // Poll job status
  const pollJobStatus = useCallback(async (id: string) => {
    try {
      await loadJob(id);
    } catch (err) {
      console.error('Error polling job status:', err);
    }
  }, [loadJob]);
  
  // Prepare context value
  const contextValue: JobContextState = {
    jobs,
    job,
    loading,
    error,
    
    loadJobs,
    loadJob,
    submitJob,
    cancelJob,
    pollJobStatus
  };
  
  return (
    <JobContext.Provider value={contextValue}>
      {children}
    </JobContext.Provider>
  );
};

// Custom hook to use the context
export const useJobContext = () => {
  const context = useContext(JobContext);
  
  if (context === undefined) {
    throw new Error('useJobContext must be used within a JobProvider');
  }
  
  return context;
};
"""
    
    write_file(contexts_dir / "JobContext.tsx", job_context)
    
    print("JobContext created successfully!")

if __name__ == "__main__":
    create_job_context()