// File: c4h-editor-micro/packages/config-editor/src/hooks/useJobApi.ts
// Migrated from original frontend

// File: frontend/src/hooks/useJobApi.ts
/**
 * Custom hook for interacting with the Job API
 * Provides methods for job management including submission, polling, and cancellation
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job } from 'shared';;
import api, { API_ENDPOINTS } from 'shared';;

export interface JobSubmitRequest {
  workOrderId: string;
  userId?: string;
  configuration?: Record<string, any>;
}

export const useJobApi = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use navigate safely - if we're not in a Router context, this will be undefined
  // but we'll handle that case gracefully
  let navigate;
  try {
    navigate = useNavigate();
  } catch (e) {
    // If we're not in a Router context, just use a no-op function
    navigate = (path: string) => {
      console.warn(`Navigation to ${path} was attempted outside of Router context`);
    };
  }

  // Fetch all jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(API_ENDPOINTS.JOBS);
      
      // Handle empty response
      if (!response.data || !response.data.items) {
        setJobs([]);
        return [];
      }
      
      // Map backend response fields to our frontend model
      const mappedJobs = response.data.items.map((item: any) => ({
        id: item.id,
        workOrderId: item.work_order_id,
        workOrderVersion: item.work_order_version,
        status: item.status,
        serviceJobId: item.service_job_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        submittedAt: item.submitted_at,
        completedAt: item.completed_at,
        userId: item.user_id,
        configuration: item.configuration || {},
        results: item.result
      }));
      
      setJobs(mappedJobs);
      return mappedJobs;
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching jobs:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch a single job
  const fetchJob = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(API_ENDPOINTS.JOB(id));
      
      // Map backend response fields to our frontend model
      const mappedJob = {
        id: response.data.id,
        workOrderId: response.data.work_order_id,
        workOrderVersion: response.data.work_order_version,
        status: response.data.status,
        serviceJobId: response.data.service_job_id,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        submittedAt: response.data.submitted_at,
        completedAt: response.data.completed_at,
        userId: response.data.user_id,
        configuration: response.data.configuration || {},
        results: response.data.result
      };
      
      setJob(mappedJob);
      return mappedJob;
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching job:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit a job
  const submitJob = useCallback(async (data: JobSubmitRequest) => {
    setLoading(true);
    setError(null);
    try {
      // Convert frontend model properties to backend API expectations
      const requestData = {
        work_order_id: data.workOrderId,
        user_id: data.userId,
        configuration: data.configuration
      };
      
      const response = await api.post(API_ENDPOINTS.JOBS, requestData);
      
      // Refresh job list after submission
      fetchJobs();
      
      // Navigate to jobs page if navigate is available
      if (navigate && typeof navigate === 'function') {
        navigate('/jobs');
      }
      
      return response.data;
    } catch (err) {
      setError(err as Error);
      console.error('Error submitting job:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate, fetchJobs]);

  // Cancel a job
  const cancelJob = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(API_ENDPOINTS.JOB_CANCEL(id));
      
      // Refresh job after cancellation
      await fetchJob(id);
      
      return response.data;
    } catch (err) {
      setError(err as Error);
      console.error('Error cancelling job:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchJob]);

  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const response = await api.get(API_ENDPOINTS.JOB(id));
      return response.data;
    } catch (err) {
      console.error('Error polling job status:', err);
      throw err;
    }
  }, []);

  const getJobLogs = useCallback(async (jobId: string) => {
    try {
      const response = await api.get(API_ENDPOINTS.JOB(jobId) + '/logs');
      return response.data;
    } catch (err) {
      console.error('Error getting job logs:', err);
      throw err;
    }
  }, []);

  return {
    jobs,
    job,
    loading,
    error,
    fetchJobs,
    fetchJob,
    submitJob,
    cancelJob,
    pollJobStatus,
    getJobLogs
  };
};

export default useJobApi;