import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  TableSortLabel,
  TablePagination,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useJobContext } from '../contexts/JobContext';
import { JobStatus } from 'shared';
import { TimeAgo } from 'shared';

interface JobsListProps {
  onSelectJob: (jobId: string) => void;
}

// Define sort direction type
type SortDirection = 'asc' | 'desc';

// Define sort field type
type SortField = 'id' | 'configurations' | 'status' | 'created_at' | 'updated_at'; // NOTE: Assuming 'updated_at' was already present based on intent pre-check

// Interface for sort state
interface SortState {
  field: SortField;
  direction: SortDirection;
}

const JobsList: React.FC<JobsListProps> = ({ onSelectJob }) => {
  const { jobs, loadJobs, loading, error } = useJobContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<SortState>({ field: 'updated_at', direction: 'desc' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Load jobs only on mount - no polling
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Format configurations for display
  const formatConfigs = useCallback((configurations: Record<string, any>) => {
    return Object.entries(configurations)
      .map(([type, config]) => `${type}: ${config.id}`)
      .join(', ');
  }, []);
  
  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let filtered = [...jobs];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(job => 
        job.id.toLowerCase().includes(term) || 
        formatConfigs(job.configurations).toLowerCase().includes(term) ||
        job.status.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    filtered = filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'configurations':
          comparison = formatConfigs(a.configurations).localeCompare(formatConfigs(b.configurations));
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created_at':
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          comparison = dateA - dateB;
          break;
        // NOTE: Assuming 'updated_at' case already exists based on intent pre-check. No change here.
        case 'updated_at':
          const updatedA = new Date(a.updatedAt || 0).getTime(); // Ensure direct access for a
          const updatedB = new Date(b.updatedAt || 0).getTime();
          comparison = updatedA - updatedB;
          break;
      }
      
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [jobs, searchTerm, sort, formatConfigs]);
  
  const handleSortChange = (field: SortField) => {
    if (sort.field === field) {
      // Toggle direction if same field
      setSort({ field, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ field, direction: 'asc' });
    }
  };
  
  // Handle page change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Jobs</Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={loadJobs}
          disabled={loading}
          sx={{ mr: 1 }}
        >
          Refresh 
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ mr: 2, flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
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
              <TableCell>
                <TableSortLabel
                  active={sort.field === 'id'}
                  direction={sort.field === 'id' ? sort.direction : 'asc'}
                  onClick={() => handleSortChange('id')}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sort.field === 'configurations'}
                  direction={sort.field === 'configurations' ? sort.direction : 'asc'}
                  onClick={() => handleSortChange('configurations')}
                >
                  Configurations
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sort.field === 'status'}
                  direction={sort.field === 'status' ? sort.direction : 'asc'}
                  onClick={() => handleSortChange('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sort.field === 'created_at'}
                  direction={sort.field === 'created_at' ? sort.direction : 'asc'}
                  onClick={() => handleSortChange('created_at')}
                >
                  Created
                </TableSortLabel>
              </TableCell>
              <TableCell>
                {/* Added Updated column header */}
                <TableSortLabel
                  active={sort.field === 'updated_at'}
                  direction={sort.field === 'updated_at' ? sort.direction : 'asc'}
                  onClick={() => handleSortChange('updated_at')}
                >
                  Updated
                  {/* NOTE: Removing the duplicate 'Updated' sort label that might have existed before */}
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Loading jobs...
                </TableCell>
              </TableRow>
            ) : filteredJobs.length === 0 ? (
              <TableRow> 
                <TableCell colSpan={5} align="center">
                  {searchTerm 
                    ? `No jobs found matching your search.` 
                    : `No jobs found. Create your first job!`}
                </TableCell>
              </TableRow>
            ) : (
              // Apply pagination to the filtered jobs
              filteredJobs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((job) => (
              <TableRow key={job.id} hover>
                <TableCell 
                  onClick={() => onSelectJob(job.id)}
                  sx={{ cursor: 'pointer' }}
                >{job.id}</TableCell>
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
                  {/* Added Updated data cell */}
                  <TimeAgo timestamp={job.updatedAt} />
                </TableCell>
                <TableCell>
                  {/* Placeholder for potential future actions */}
                </TableCell>
              </TableRow>
            ))
          )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={filteredJobs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        />
      </TableContainer>
    </Box> 
  );
};

// Helper function to get status chip color
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

export default JobsList;