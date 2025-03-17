// File: c4h-editor-micro/packages/shell/src/components/JobDetails/JobDetails.tsx
// Migrated from original frontend

// File: frontend/src/components/JobDetails/JobDetails.tsx
import { useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, CircularProgress, Chip } from '@mui/material';
import TimeAgo from '../common/TimeAgo';; // Fixed import
import { useJobApi } from '@/hooks/useJobApi';;
import { JobStatus } from 'shared';;

// Props interface
interface JobDetailsProps {
  jobId: string;
  onClose: () => void;
  onCancel: (jobId: string) => void;
}

export const JobDetails: React.FC<JobDetailsProps> = ({ jobId, onClose, onCancel }) => {
  const { job, fetchJob, loading, error } = useJobApi();

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
  const getStatusColor = (status: string) => {
    switch (status) {
      case JobStatus.CREATED:
        return 'default';
      case JobStatus.SUBMITTED:
        return 'info';
      case JobStatus.RUNNING:
        return 'primary';
      case JobStatus.COMPLETED:
        return 'success';
      case JobStatus.FAILED:
        return 'error';
      case JobStatus.CANCELLED:
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
          <Typography variant="subtitle2">Work Order: {job.workOrderId}</Typography>
          <Box sx={{ mt: 1 }}>
            <Chip 
              label={job.status} 
              color={getStatusColor(job.status)} 
              sx={{ mr: 1 }} 
            />
            <Typography variant="body2" component="span">
              Created <TimeAgo timestamp={job.createdAt} />
            </Typography>
          </Box>
        </Box>

        {job.submittedAt && (
          <Typography variant="body2">
            Submitted <TimeAgo timestamp={job.submittedAt} />
          </Typography>
        )}

        {job.completedAt && (
          <Typography variant="body2">
            Completed <TimeAgo timestamp={job.completedAt} />
          </Typography>
        )}

        {job.results && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Results</Typography>
            {job.results.output && (
              <Typography variant="body2" component="pre" sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, overflow: 'auto' }}>
                {job.results.output}
              </Typography>
            )}
            {job.results.error && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                Error: {job.results.error}
              </Typography>
            )}
          </Box>
        )}

        {(job.status === JobStatus.SUBMITTED || job.status === JobStatus.RUNNING) && (
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