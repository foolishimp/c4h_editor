// File: frontend/src/components/JobDetails/JobDetails.tsx
import React, { useEffect, useState } from 'react';
import { Job } from '../../types/job';
import { useJobApi } from '../../hooks/useJobApi';

export interface JobDetailsProps {
  jobId: string;
  onClose: () => void;
  onCancel: (jobId: string) => void;
}

export function JobDetails({ jobId, onClose, onCancel }: JobDetailsProps) {
  const [job, setJob] = useState<Job | null>(null);
  const { getJob, pollJobStatus, cancelJob, loading, error } = useJobApi();
  
  useEffect(() => {
    if (jobId) {
      getJob(jobId).then(jobData => {
        if (jobData) {
          setJob(jobData);
        }
      });
    }
  }, [jobId, getJob]);
  
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (job && (job.status === 'submitted' || job.status === 'running')) {
      intervalId = window.setInterval(() => {
        pollJobStatus(job.id)
          .then(updatedJob => {
            // Update job status
            if (updatedJob) {
              setJob(updatedJob);
            }
          })
          .catch(error => {
            console.error('Error polling job status:', error);
          });
      }, 5000);
    }
    
    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [job, pollJobStatus]);
  
  // Error display
  if (error) {
    return <div className="error-message">
      {typeof error === 'string' ? error : error?.message || 'An error occurred'}
    </div>;
  }
  
  // Rest of component implementation
}

export default JobDetails;