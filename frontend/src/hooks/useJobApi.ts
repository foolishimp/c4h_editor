// File: frontend/src/hooks/useJobApi.ts
import { useState, useCallback } from 'react';
import { Job } from '../types/job';
import api from '../config/api';

export const useJobApi = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/jobs');
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
        configuration: item.configuration,
        results: item.result
      }));
      setJobs(mappedJobs);
      return mappedJobs;
    } catch (err) {
      setError((err as Error).message);
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
      const response = await api.get(`/api/v1/jobs/${id}`);
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
        configuration: response.data.configuration,
        results: response.data.result
      };
      setJob(mappedJob);
      return mappedJob;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit a job
  const submitJob = useCallback(async (data: { workOrderId: string }) => {
    setLoading(true);
    setError(null);
    try {
      // Convert frontend model properties to backend API expectations
      const requestData = {
        work_order_id: data.workOrderId
      };
      const response = await api.post('/api/v1/jobs', requestData);
      return response.data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancel a job
  const cancelJob = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/v1/jobs/${id}/cancel`);
      return response.data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const response = await api.get(`/api/v1/jobs/${id}`);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const getJobLogs = useCallback(async (jobId: string) => {
    try {
      const response = await api.get(`/api/v1/jobs/${jobId}/logs`);
      return response.data;
    } catch (err) {
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