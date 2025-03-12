import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, Chip, TextField, MenuItem, 
  Select, FormControl, InputLabel, CircularProgress, Pagination, Alert
} from '@mui/material';
import { RefreshOutlined, FilterList, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Job, JobStatus } from '../../types/job';
import { useJobApi } from '../../hooks/useJobApi';
import TimeAgo from '../common/TimeAgo';

const statusColors = {
  [JobStatus.PENDING]: '#9e9e9e',    // Grey
  [JobStatus.QUEUED]: '#ff9800',     // Orange
  [JobStatus.RUNNING]: '#2196f3',    // Blue
  [JobStatus.SUCCEEDED]: '#4caf50',  // Green
  [JobStatus.FAILED]: '#f44336',     // Red
  [JobStatus.CANCELED]: '#9c27b0',   // Purple
  [JobStatus.TIMED_OUT]: '#795548',  // Brown
};

const JobsList: React.FC = () => {
  const navigate = useNavigate();
  const { getJobs, loading, error } = useJobApi();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  const fetchJobs = async () => {
    try {
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (searchQuery) filters.search = searchQuery;
      
      const response = await getJobs(filters);
      setJobs(response.jobs || []);
      setTotalPages(Math.ceil((response.total || 1) / 10)); // Assuming 10 items per page
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
    // Set up a refresh interval
    const intervalId = setInterval(fetchJobs, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [statusFilter, searchQuery, page]);

  const handleJobClick = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Box m={2}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Jobs</Typography>
          <Box>
            <IconButton onClick={() => setShowFilters(!showFilters)}>
              <FilterList />
            </IconButton>
            <IconButton onClick={fetchJobs}>
              <RefreshOutlined />
            </IconButton>
          </Box>
        </Box>
        
        {showFilters && (
          <Box mb={2} display="flex" gap={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as JobStatus | '')}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {Object.values(JobStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              size="small"
              label="Search"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                endAdornment: <Search color="action" />,
              }}
            />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error loading jobs: {error.message}
          </Alert>
        )}
        
        {loading && jobs.length === 0 ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : jobs.length === 0 ? (
          <Alert severity="info">No jobs found</Alert>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Work Order</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Duration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow 
                      key={job.id} 
                      hover 
                      onClick={() => handleJobClick(job.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {job.id.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                          {job.workOrder?.metadata?.description || job.workOrderId}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          size="small"
                          sx={{ 
                            backgroundColor: statusColors[job.status] || '#9e9e9e',
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TimeAgo date={job.submitTime} />
                      </TableCell>
                      <TableCell>
                        {job.stats?.duration ? 
                          `${Math.round(job.stats.duration / 1000)}s` : 
                          job.status === JobStatus.RUNNING ? 
                            'Running...' : 
                            '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default JobsList;