import { useState } from 'react';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { Job } from '../types/job';

const useJobApi = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getJobs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.JOBS);
      setJobs(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to get jobs');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getJob = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.JOB(id));
      setJob(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to get job');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitJob = async (data: { workorder_id: string, parameters?: any }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.JOB_SUBMIT, data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to submit job');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelJob = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.JOB_CANCEL(id));
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel job');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (id: string, interval = 2000, maxAttempts = 30) => {
    let attempts = 0;
    
    const poll = () => {
      return new Promise<Job>((resolve, reject) => {
        const checkStatus = async () => {
          try {
            const jobData = await getJob(id);
            
            if (jobData.status === 'completed' || jobData.status === 'failed') {
              resolve(jobData);
            } else if (attempts >= maxAttempts) {
              reject(new Error('Polling timeout exceeded'));
            } else {
              attempts++;
              setTimeout(checkStatus, interval);
            }
          } catch (err) {
            reject(err);
          }
        };
        
        checkStatus();
      });
    };
    
    return poll();
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
    pollJobStatus
  };
};

export default useJobApi;