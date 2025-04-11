import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { apiService } from 'shared';
import { Job, JobStatus, JobConfigReference } from 'shared';

// Context state interface
interface JobContextState {
  jobs: Job[];
  job: Job | null;
  loading: boolean;
  error: string | null;

  loadJobs: () => Promise<void>;
  loadJob: (id: string) => Promise<void>;
  cancelJob: (id: string) => Promise<void>;
  pollJobStatus: (id: string) => Promise<void>;
  submitJobConfigurations: (configs: JobConfigReference[]) => Promise<void>;
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
      // The response is directly the data, not wrapped in a data property
      const response = await apiService.getJobs();
      
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


  // File: /Users/jim/src/apps/c4h_editor/c4h-micro/packages/job-management/src/contexts/JobContext.tsx
  // Fixed to handle dates as strings per the Job interface requirements

  // Load a specific job
  const loadJob = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getJob(id);
      
      // Handle different response formats - some endpoints wrap in data, others don't
      const jobData = response.data || response;
      
      if (!jobData || !jobData.id) {
        throw new Error(`Invalid job data received for job ID: ${id}`);
      }
      
      // Map response to Job type - maintaining date strings as per the Job interface
      const mappedJob: Job = {
        id: jobData.id,
        configurations: jobData.configurations || {},
        status: jobData.status as JobStatus,
        serviceJobId: jobData.service_job_id,
        createdAt: jobData.created_at || new Date().toISOString(),
        updatedAt: jobData.updated_at || new Date().toISOString(),
        submittedAt: jobData.submitted_at || undefined,
        completedAt: jobData.completed_at || undefined,
        userId: jobData.user_id,
        jobConfiguration: jobData.job_configuration || {},
        result: jobData.result
      };
      
      setJob(mappedJob);
    } catch (err: any) {
      const errorMessage = err.message || `Failed to load job: ${id}`;
      console.error('Error loading job:', err);
      setError(errorMessage);
      setJob(null); // Make sure we clear the job state on error
    } finally {
      setLoading(false);
    }
  }, []);

  // New method that accepts configuration list
  const submitJobConfigurations = useCallback(async (configs: JobConfigReference[]) => {
    setLoading(true); 
    setError(null);
    
    try {
      // Validate required configurations
      if (!configs || configs.length === 0) {
        throw new Error("At least one configuration must be provided");
      }

      // Use apiService to submit the job with configurations list
      await apiService.submitJobConfigs(configs);
      
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
      await apiService.cancelJob(id);
      
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
    submitJobConfigurations,
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