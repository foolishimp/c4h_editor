// File: frontend/src/components/JobDetails/JobDetails.tsx
import React, { useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, CircularProgress, Chip } from '@mui/material';
import { TimeAgo } from '../common/TimeAgo';
import { useJobApi } from '../../hooks/useJobApi';
import { JobStatus } from '../../types/job';

// Props interface
interface JobDetailsProps {
  jobId: string;
  onClose: () => void;
  onCancel: (jobId: string) => void;
}

export const JobDetails: React.FC<JobDetailsProps> = ({ jobId, onClose, onCancel }) => {
  const { job, fetchJob, cancelJob, loading, error } = useJobApi();

  useEffect(() => {
    if (jobId) {
      fetchJob(jobId);
    }
  }, [jobId, fetchJob]);

  // Handle job cancellation
  const handleCancel = () => {
    if (jobId) {
      onCancel(jobId);
    }
  };

  // Get status chip color
  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'created':
        return 'default';
      case 'submitted':
        return 'info';
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">Error loading job: {error.toString()}</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Job Details</Typography>
          <Button onClick={onClose}>Close</Button>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">ID: {job.id}</Typography>
          <Typography variant="subtitle2">Work Order: {job.work_order_id}</Typography>
          <Box sx={{ mt: 1 }}>
            <Chip 
              label={job.status} 
              color={getStatusColor(job.status as JobStatus)} 
              sx={{ mr: 1 }} 
            />
            <Typography variant="body2" component="span">
              Created <TimeAgo timestamp={job.created_at} />
            </Typography>
          </Box>
        </Box>

        {job.submitted_at && (
          <Typography variant="body2">
            Submitted <TimeAgo timestamp={job.submitted_at} />
          </Typography>
        )}

        {job.completed_at && (
          <Typography variant="body2">
            Completed <TimeAgo timestamp={job.completed_at} />
          </Typography>
        )}

        {job.result && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Results</Typography>
            {job.result.output && (
              <Typography variant="body2" component="pre" sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, overflow: 'auto' }}>
                {job.result.output}
              </Typography>
            )}
            {job.result.error && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                Error: {job.result.error}
              </Typography>
            )}
          </Box>
        )}

        {(job.status === 'submitted' || job.status === 'running') && (
          <Button 
            variant="outlined" 
            color="warning" 
            sx={{ mt: 2 }} 
            onClick={handleCancel}
          >
            Cancel Job
          </Button>
        )}
      </CardContent>
    </Card>
  );
};