// File: packages/job-management/src/components/JobsList.tsx
import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useJobContext } from '../contexts/JobContext';
import { JobStatus } from 'shared';
import { TimeAgo } from 'shared';

interface JobsListProps {
  onSelectJob: (jobId: string) => void;
}

const JobsList: React.FC<JobsListProps> = ({ onSelectJob }) => {
  const { jobs, loadJobs, loading, error } = useJobContext();
  
  // Load jobs on mount
  useEffect(() => {
    loadJobs();
    
    // Set up polling interval
    const interval = setInterval(() => {
      loadJobs();
    }, 10000); // Poll every 10 seconds
    
    // Clean up interval
    return () => clearInterval(interval);
  }, [loadJobs]);
  
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
  
  // Format configurations for display
  const formatConfigs = (configurations: Record<string, any>) => {
    return Object.entries(configurations)
      .map(([type, config]) => `${type}: ${config.id}`)
      .join(', ');
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Jobs</Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={loadJobs}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      {error && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Configurations</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Loading jobs...
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No jobs found. Create your first job!
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.id}</TableCell>
                  <TableCell>{formatConfigs(job.configurations)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={job.status} 
                      color={getStatusColor(job.status)} 
                    />
                  </TableCell>
                  <TableCell>
                    <TimeAgo timestamp={job.createdAt} />
                  </TableCell>
                  <TableCell>
                    <TimeAgo timestamp={job.updatedAt} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onSelectJob(job.id)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default JobsList;
