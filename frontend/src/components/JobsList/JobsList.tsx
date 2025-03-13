// File: frontend/src/components/JobsList/JobsList.tsx
import { useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { TimeAgo } from '../common/TimeAgo';
import { Job, JobStatus } from '../../types/job';
import { WorkOrder } from '../../types/workorder';

interface JobsListProps {
  jobs: Job[];
  workOrders: WorkOrder[];
  onSelect: (jobId: string) => void;
  onSubmitJob: (workOrderId: string) => void;
  onRefresh: () => void;
}

export const JobsList: React.FC<JobsListProps> = ({ jobs, workOrders, onSelect, onSubmitJob, onRefresh }) => {
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('');

  const handleWorkOrderChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedWorkOrderId(event.target.value as string);
  };

  const handleSubmitJob = () => {
    if (selectedWorkOrderId) {
      onSubmitJob(selectedWorkOrderId);
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Jobs</Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={onRefresh}
        >
          Refresh
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Submit New Job</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 300, mr: 2 }}>
              <InputLabel>Select Work Order</InputLabel>
              <Select
                value={selectedWorkOrderId}
                onChange={handleWorkOrderChange as any}
                label="Select Work Order"
              >
                {workOrders.map((workOrder) => (
                  <MenuItem key={workOrder.id} value={workOrder.id}>
                    {workOrder.id} - {workOrder.metadata.description || 'No description'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button 
              variant="contained" 
              onClick={handleSubmitJob}
              disabled={!selectedWorkOrderId}
            >
              Submit Job
            </Button>
          </Box>
        </CardContent>
      </Card>

      {jobs.length === 0 ? (
        <Typography variant="body1">No jobs found.</Typography>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Work Order</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.id}</TableCell>
                  <TableCell>{job.work_order_id}</TableCell>
                  <TableCell>
                    <Chip 
                      label={job.status} 
                      color={getStatusColor(job.status as JobStatus)} 
                    />
                  </TableCell>
                  <TableCell>
                    <TimeAgo timestamp={job.created_at} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onSelect(job.id)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};