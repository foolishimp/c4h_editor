// File: frontend/src/components/JobsList/JobsList.tsx
import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimeAgo from '../common/TimeAgo';
import { Job, JobStatus } from '../../types/job';
import { WorkOrder } from '../../types/workorder';
import { useWorkOrderApi } from '../../hooks/useWorkOrderApi';
import { useJobApi } from '../../hooks/useJobApi';

interface JobsListProps {
  onSelect: (jobId: string) => void;
  onRefresh?: () => void;
}

export const JobsList: React.FC<JobsListProps> = ({ 
  onSelect,
  onRefresh
}) => {
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const { fetchWorkOrders } = useWorkOrderApi();
  const { fetchJobs, submitJob } = useJobApi();

  // Load work orders and jobs on component mount
  useEffect(() => {
    loadWorkOrders();
    loadJobs();
  }, []);

  const loadWorkOrders = async () => {
    setLoading(true);
    try {
      const result = await fetchWorkOrders();
      // Filter out archived work orders
      const activeWorkOrders = result.filter((wo: WorkOrder) => !wo.metadata?.archived);
      setWorkOrders(activeWorkOrders);
      setError(null);
    } catch (err) {
      setError(`Failed to load work orders: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error loading work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const result = await fetchJobs();
      setJobs(result);
      setError(null);
    } catch (err) {
      setError(`Failed to load jobs: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkOrderChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedWorkOrderId(event.target.value as string);
  };

  const handleSubmitJob = async () => {
    if (!selectedWorkOrderId) return;
    
    setLoading(true);
    try {
      await submitJob({ workOrderId: selectedWorkOrderId });
      // Refresh jobs list
      await loadJobs();
      // Reset selected work order
      setSelectedWorkOrderId('');
      setError(null);
    } catch (err) {
      setError(`Failed to submit job: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error submitting job:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadWorkOrders(), loadJobs()]);
    if (onRefresh) onRefresh();
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  // Filter jobs based on tab value
  const filteredJobs = jobs.filter(job => {
    if (tabValue === 0) { // Active jobs
      return [JobStatus.CREATED, JobStatus.SUBMITTED, JobStatus.RUNNING].includes(job.status as JobStatus);
    } else { // Completed jobs
      return [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED].includes(job.status as JobStatus);
    }
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Jobs</Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={handleRefresh}
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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Submit New Job</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 300, mr: 2 }}>
              <InputLabel id="work-order-select-label">Select Work Order</InputLabel>
              <Select
                labelId="work-order-select-label"
                value={selectedWorkOrderId}
                onChange={handleWorkOrderChange as any}
                label="Select Work Order"
                disabled={loading || workOrders.length === 0}
              >
                {workOrders.map((workOrder) => (
                  <MenuItem key={workOrder.id} value={workOrder.id}>
                    {workOrder.id} - {workOrder.metadata?.description || 'No description'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button 
              variant="contained" 
              onClick={handleSubmitJob}
              disabled={!selectedWorkOrderId || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit Job'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        sx={{ mb: 2 }}
      >
        <Tab label="Active Jobs" />
        <Tab label="Completed Jobs" />
      </Tabs>

      {loading && jobs.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredJobs.length === 0 ? (
        <Typography variant="body1">No {tabValue === 0 ? 'active' : 'completed'} jobs found.</Typography>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Work Order</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.id}</TableCell>
                  <TableCell>{job.workOrderId}</TableCell>
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

export default JobsList;