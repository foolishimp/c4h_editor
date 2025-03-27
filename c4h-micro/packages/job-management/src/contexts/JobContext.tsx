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

// Define interfaces for API responses
interface JobsResponse {
  items: any[];
  total: number;
  limit: number;
  offset: number;
}


interface JobResponse {
  data: {
    id: string;
    configurations: Record<string, any>;
    status: string;
    service_job_id: string;
    created_at: string;
    updated_at: string;
    submitted_at: string;
    completed_at: string;
    user_id: string;
    job_configuration: Record<string, any>;
    result: any;
  };
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
      // The response is directly the data, not wrapped in a data property
      const response = await api.get<JobsResponse>('/api/v1/jobs');
      
      // Safely access items with fallback to empty array
      const jobsData = (response.items || []).map((item: any) => ({
        id: item.id,
        configurations: item.configurations || {},
        status: item.status as JobStatus,
        serviceJobId: item.service_job_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        submittedAt: item.submitted_at,
        completedAt: item.completed_at,
        userId: item.user_id,
        jobConfiguration: item.job_configuration || {},
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
      const response = await api.get<JobResponse>(`/api/v1/jobs/${id}`);
      
      // Map response to Job type
      const jobData: Job = {
        id: response.data.id,
        configurations: response.data.configurations || {},
        status: response.data.status as JobStatus,
        serviceJobId: response.data.service_job_id,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        submittedAt: response.data.submitted_at,
        completedAt: response.data.completed_at,
        userId: response.data.user_id,
        jobConfiguration: response.data.job_configuration || {},
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
      // Format the configurations as expected by the API
      const configurations = Object.entries(configs).reduce((acc, [type, id]) => {
        acc[type] = { id }; // Format each config as an object with id property
        return acc;
      }, {} as Record<string, { id: string }>);
      
      const requestData = {
        configurations,
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
      // Extract more detailed error information if available
      const errorDetail = err.response?.data?.detail;
      let errorMessage = 'Failed to submit job';
      
      if (errorDetail) {
        // If the API returned validation errors, format them for display
        if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
        } else if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else {
          errorMessage = JSON.stringify(errorDetail);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
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