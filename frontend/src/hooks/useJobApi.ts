// File: frontend/src/hooks/useJobApi.ts
import { useState } from 'react';
import { Job } from '../types/job';
import { api } from '../config/api';

export function useJobApi() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getJobs = async (): Promise<Job[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/jobs');
      const data = response.data.items;
      setJobs(data);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return [];
    }
  };

  const getJob = async (id: string): Promise<Job | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/jobs/${id}`);
      const data = response.data;
      setJob(data);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  };

  const submitJob = async (data: { workorder_id: string; parameters?: any }): Promise<Job | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/v1/jobs', {
        work_order_id: data.workorder_id
      });
      const responseData = response.data;
      await getJobs();
      setLoading(false);
      return responseData;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  };

  const cancelJob = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/v1/jobs/${id}/cancel`);
      await getJobs();
      if (job && job.id === id) {
        await getJob(id);
      }
      setLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return false;
    }
  };

  const pollJobStatus = async (id: string): Promise<Job | null> => {
    try {
      const response = await api.get(`/api/v1/jobs/${id}`);
      const data = response.data;
      if (job && job.id === id) {
        setJob(data);
      }
      return data;
    } catch (err) {
      console.error("Error polling job status:", err);
      return null;
    }
  };

  const getJobLogs = async (jobId: string): Promise<any> => {
    setLoading(true);
    try {
      const response = await api.get(`/api/v1/jobs/${jobId}/logs`);
      setLoading(false);
      return response.data;
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setLoading(false);
      return null;
    }
  };

  return {
    jobs,
    job,
    loading,
    error,
    getJobs,
    getJob,
    submitJob,
    cancelJob,
    pollJobStatus,
    getJobLogs
  };
}