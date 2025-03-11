import { useState, useCallback } from 'react';
import axios from 'axios';
import { Job, JobCreateRequest, JobStatus, JobUpdateRequest } from '../types/job';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';

export const useJobApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get all jobs
  const getJobs = useCallback(async (filters?: {
    status?: JobStatus,
    workOrderId?: string,
    fromDate?: string,
    toDate?: string,
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobs`, { params: filters });
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch jobs'));
      setLoading(false);
      throw err;
    }
  }, []);

  // Get a specific job by ID
  const getJob = useCallback(async (jobId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobs/${jobId}`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch job'));
      setLoading(false);
      throw err;
    }
  }, []);

  // Create a new job
  const createJob = useCallback(async (jobData: JobCreateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/jobs`, jobData);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create job'));
      setLoading(false);
      throw err;
    }
  }, []);

  // Update job status (e.g., cancel)
  const updateJob = useCallback(async (jobId: string, updateData: JobUpdateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/jobs/${jobId}`, updateData);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update job'));
      setLoading(false);
      throw err;
    }
  }, []);

  // Cancel a job
  const cancelJob = useCallback(async (jobId: string) => {
    return updateJob(jobId, { status: JobStatus.CANCELED });
  }, [updateJob]);

  // Get job logs
  const getJobLogs = useCallback(async (jobId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobs/${jobId}/logs`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch job logs'));
      setLoading(false);
      throw err;
    }
  }, []);

  // Poll job status (for real-time updates)
  const pollJobStatus = useCallback((jobId: string, intervalMs = 5000, callback: (job: Job) => void) => {
    const intervalId = setInterval(async () => {
      try {
        const job = await getJob(jobId);
        callback(job);

        // Stop polling if job is in a terminal state
        if ([
          JobStatus.SUCCEEDED, 
          JobStatus.FAILED, 
          JobStatus.CANCELED, 
          JobStatus.TIMED_OUT
        ].includes(job.status)) {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Error polling job status:', err);
      }
    }, intervalMs);
    
    // Return function to stop polling
    return () => clearInterval(intervalId);
  }, [getJob]);

  return {
    loading,
    error,
    getJobs,
    getJob,
    createJob,
    updateJob,
    cancelJob,
    getJobLogs,
    pollJobStatus,
  };
};