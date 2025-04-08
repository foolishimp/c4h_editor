// File: packages/job-management/src/components/JobDetails.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel'; 
import { useJobContext } from '../contexts/JobContext';
import { JobStatus, JobConfigReference } from 'shared';
import { TimeAgo } from 'shared';

interface JobDetailsProps {
  jobId: string;
  onClose: () => void;
}

const JobDetails: React.FC<JobDetailsProps> = ({ jobId, onClose }) => {
  const { job, loadJob, cancelJob, error, loading } = useJobContext();
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Load job on mount and jobId change
  useEffect(() => {
    loadJob(jobId);
    
    // Set up polling for active jobs
    const interval = setInterval(() => {
      if (job && [JobStatus.CREATED, JobStatus.SUBMITTED, JobStatus.RUNNING].includes(job.status)) {
        loadJob(jobId);
      }
    }, 5000); // Poll every 5 seconds
    
    setPollingInterval(interval);
    
    // Cleanup function
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [jobId, loadJob, job?.status]);
  
  
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
  
  // Handle cancel job
  const handleCancel = () => {
    if (job) {
      cancelJob(job.id); 
    }
  };
  
  // Format configurations for display
  const formatConfigValue = (value: string | JobConfigReference): string => {
    if (typeof value === 'string') {
      return value;
    }
    return value.id || 'Unknown';
  };
  
  if (loading && !job) { 
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography color="error">Error loading job: {error}</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography>Job not found</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Job Details</Typography>
          <Button 
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={onClose}
          >
            Close
          </Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1">ID: {job.id}</Typography>
          
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
            <Chip 
              label={job.status} 
              color={getStatusColor(job.status)} 
              sx={{ mr: 2 }}
            />
            
            {[JobStatus.CREATED, JobStatus.SUBMITTED, JobStatus.RUNNING].includes(job.status) && (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
              >
                Cancel Job
              </Button>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="h6" gutterBottom>Configurations</Typography>
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          {Object.entries(job.configurations).map(([type, config]) => (
            <Box key={type} sx={{ mb: 1 }}>
              <Typography variant="subtitle2">{type}:</Typography>
              <Typography variant="body2">{formatConfigValue(config)}</Typography>
            </Box>
          ))}
        </Paper>

        <Typography variant="h6" gutterBottom>Timeline</Typography>
        <List dense sx={{ mb: 3 }}>
          <ListItem>
            <ListItemText 
              primary="Created" 
              secondary={<TimeAgo timestamp={job.createdAt} />} 
            />
          </ListItem>

          {job.submittedAt && (
            <ListItem>
              <ListItemText 
                primary="Submitted" 
                secondary={<TimeAgo timestamp={job.submittedAt} />} 
              />
            </ListItem>
          )}

          {job.completedAt && (
            <ListItem>
              <ListItemText 
                primary="Completed" 
                secondary={<TimeAgo timestamp={job.completedAt} />} 
              />
            </ListItem>
          )}
        </List>

        {job.result && (
          <>
            <Typography variant="h6" gutterBottom>Results</Typography>
            
            {job.result.output && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Output:</Typography>
                <Box component="pre" sx={{ 
                  whiteSpace: 'pre-wrap', 
                  backgroundColor: '#f5f5f5',
                  p: 2,
                  borderRadius: 1
                }}>
                  {job.result.output}
                </Box>
              </Paper>
            )}

            {job.result.error && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom color="error">Error:</Typography>
                <Box component="pre" sx={{ 
                  whiteSpace: 'pre-wrap', 
                  backgroundColor: '#fff1f1', 
                  color: '#d32f2f',
                  p: 2,
                  borderRadius: 1
                }}>
                  {job.result.error}
                </Box>
              </Paper>
            )}

            {job.result.metrics && Object.keys(job.result.metrics).length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Metrics:</Typography>
                <List dense>
                  {Object.entries(job.result.metrics).map(([key, value]) => (
                    <ListItem key={key}>
                      <ListItemText 
                        primary={key} 
                        secondary={value.toString()} 
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default JobDetails;