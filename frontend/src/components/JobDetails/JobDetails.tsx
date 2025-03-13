// File: frontend/src/components/JobDetails/JobDetails.tsx
import React, { useState, useEffect } from 'react';
import { useJobApi } from '../../hooks/useJobApi';
import { Job } from '../../types/job';

export interface JobDetailsProps {
  jobId: string;
  onClose: () => void;
  onCancel: (jobId: string) => void;
}

function JobDetails({ jobId, onClose, onCancel }: JobDetailsProps) {
  const [job, setJob] = useState<Job | null>(null);
  const { getJob, pollJobStatus } = useJobApi();
  
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
  
  return (
    <div>
      <h2>Job Details</h2>
      <button onClick={onClose}>Close</button>
      
      {job && (
        <div>
          <p>ID: {job.id}</p>
          <p>Work Order ID: {job.work_order_id}</p>
          <p>Status: {job.status}</p>
          
          {(job.status === 'submitted' || job.status === 'running') && (
            <button onClick={() => onCancel(job.id)}>Cancel Job</button>
          )}
          
          {job.result && (
            <div>
              <h3>Result</h3>
              <pre>{JSON.stringify(job.result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default JobDetails;