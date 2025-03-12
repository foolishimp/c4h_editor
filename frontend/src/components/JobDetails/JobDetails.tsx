import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Paper, Typography, Chip, Button, CircularProgress, 
  Tabs, Tab, Alert, LinearProgress, Divider, Card, CardContent, 
  List, ListItem, ListItemText, Grid
} from '@mui/material';
import { 
  PlayArrow, Stop, Refresh, ArrowBack,
  CheckCircle, Error as ErrorIcon, HourglassEmpty
} from '@mui/icons-material';
import { Job, JobStatus } from '../../types/job';
import { useJobApi } from '../../hooks/useJobApi';
import TimeAgo from '../common/TimeAgo';
import MonacoEditor from '@monaco-editor/react';

const statusIcons = {
  [JobStatus.PENDING]: <HourglassEmpty />,
  [JobStatus.QUEUED]: <HourglassEmpty />,
  [JobStatus.RUNNING]: <PlayArrow />,
  [JobStatus.SUCCEEDED]: <CheckCircle color="success" />,
  [JobStatus.FAILED]: <ErrorIcon color="error" />,
  [JobStatus.CANCELED]: <Stop color="warning" />,
  [JobStatus.TIMED_OUT]: <ErrorIcon color="warning" />,
};

const statusColors = {
  [JobStatus.PENDING]: '#9e9e9e',
  [JobStatus.QUEUED]: '#ff9800',
  [JobStatus.RUNNING]: '#2196f3',
  [JobStatus.SUCCEEDED]: '#4caf50',
  [JobStatus.FAILED]: '#f44336',
  [JobStatus.CANCELED]: '#9c27b0',
  [JobStatus.TIMED_OUT]: '#795548',
};

export interface JobDetailsProps {
  jobId: string;
  onClose: () => void;
  onCancel: (jobId: string) => void;
}

export function JobDetails({ jobId, onClose, onCancel }: JobDetailsProps) {
  const navigate = useNavigate();
  const { getJob, getJobLogs, cancelJob, pollJobStatus, loading, error } = useJobApi();
  
  const [job, setJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const pollingRef = useRef<(() => void) | null>(null);
  
  const loadJob = useCallback(async () => {
    if (!jobId) return;
    
    try {
      const data = await getJob(jobId);
      setJob(data);
      
      // If we're on the logs tab, also fetch logs
      if (activeTab === 'logs') {
        try {
          const logsData = await getJobLogs(jobId);
          setLogs(logsData.logs || 'No logs available');
        } catch (logsErr) {
          console.error('Failed to load job logs:', logsErr);
          setLogs('Error loading logs');
        }
      }
    } catch (err) {
      console.error('Failed to load job details:', err);
    }
  }, [jobId, getJob, getJobLogs, activeTab]);
  
  // Initial load and setup polling
  useEffect(() => {
    loadJob();
    
    // Clean up previous polling if exists
    if (pollingRef.current) {
      pollingRef.current();
      pollingRef.current = null;
    }
    
    // Set up polling for job status
    if (jobId) {
      pollingRef.current = pollJobStatus(jobId, 5000, (updatedJob) => {
        setJob(updatedJob);
      });
    }
    
    return () => {
      if (pollingRef.current) {
        pollingRef.current();
      }
    };
  }, [jobId, loadJob, pollJobStatus]);
  
  // Fetch logs when switching to logs tab
  useEffect(() => {
    if (activeTab === 'logs' && jobId) {
      getJobLogs(jobId)
        .then(data => setLogs(data.logs || 'No logs available'))
        .catch(err => {
          console.error('Failed to load job logs:', err);
          setLogs('Error loading logs');
        });
    }
  }, [activeTab, jobId, getJobLogs]);

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
  
  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };
  
  const handleCancelJob = async () => {
    if (!jobId) return;
    
    try {
      await cancelJob(jobId);
      loadJob(); // Reload job to get updated status
      onCancel(jobId);
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  };
  
  const isJobRunning = job?.status === JobStatus.RUNNING || job?.status === JobStatus.QUEUED;
  
  if (loading && !job) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box m={2}>
        <Alert severity="error">Error loading job: {error.message}</Alert>
      </Box>
    );
  }
  
  if (!job) {
    return (
      <Box m={2}>
        <Alert severity="warning">No job found</Alert>
      </Box>
    );
  }
  
  return (
    <Box m={2}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => {
          onClose();
          navigate('/jobs');
        }}
        sx={{ mb: 2 }}
      >
        Back to Jobs
      </Button>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <Typography variant="h5" component="h1" sx={{ mr: 2 }}>
              Job: {job.id.substring(0, 8)}...
            </Typography>
            <Chip
              icon={statusIcons[job.status]}
              label={job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              sx={{
                backgroundColor: statusColors[job.status],
                color: 'white',
              }}
            />
          </Box>
          
          <Box>
            {isJobRunning && (
              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<Stop />}
                onClick={handleCancelJob}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
            )}
            <Button 
              variant="outlined" 
              startIcon={<Refresh />}
              onClick={loadJob}
            >
              Refresh
            </Button>
          </Box>
        </Box>
        
        <Box mt={2} mb={2}>
          <Typography variant="subtitle1">
            Work Order: {' '}
            <Typography 
              component="span" 
              color="primary" 
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate(`/workorders/${job.workOrderId}`)}
            >
              {job.workOrder?.metadata?.description || job.workOrderId}
            </Typography>
          </Typography>
          
          <Typography variant="body2">
            Submitted <TimeAgo date={job.submitTime} />
          </Typography>
          
          {isJobRunning && job.stats?.progress !== undefined && (
            <Box mt={1}>
              <LinearProgress 
                variant="determinate" 
                value={job.stats.progress} 
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="caption" align="center" display="block">
                {Math.round(job.stats.progress)}% Complete
              </Typography>
            </Box>
          )}
        </Box>
        
        <Divider />
        
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="job tabs" sx={{ mt: 2 }}>
          <Tab label="Overview" value="overview" />
          <Tab label="Parameters" value="parameters" />
          <Tab label="Results" value="results" />
          <Tab label="Logs" value="logs" />
          {job.errors && job.errors.length > 0 && (
            <Tab 
              label="Errors" 
              value="errors" 
              icon={<ErrorIcon fontSize="small" color="error" />}
              iconPosition="end"
            />
          )}
        </Tabs>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <Box mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Timing Information</Typography>
                    <List dense disablePadding>
                      <ListItem>
                        <ListItemText 
                          primary="Submit Time"
                          secondary={new Date(job.submitTime).toLocaleString()}
                        />
                      </ListItem>
                      {job.stats?.startTime && (
                        <ListItem>
                          <ListItemText 
                            primary="Start Time"
                            secondary={new Date(job.stats.startTime).toLocaleString()}
                          />
                        </ListItem>
                      )}
                      {job.stats?.endTime && (
                        <ListItem>
                          <ListItemText 
                            primary="End Time"
                            secondary={new Date(job.stats.endTime).toLocaleString()}
                          />
                        </ListItem>
                      )}
                      {job.stats?.duration && (
                        <ListItem>
                          <ListItemText 
                            primary="Duration"
                            secondary={`${(job.stats.duration / 1000).toFixed(2)} seconds`}
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Resource Usage</Typography>
                    {job.stats?.resourceUsage ? (
                      <List dense disablePadding>
                        {Object.entries(job.stats.resourceUsage).map(([resource, value]) => (
                          <ListItem key={resource}>
                            <ListItemText 
                              primary={resource.charAt(0).toUpperCase() + resource.slice(1)} 
                              secondary={value.toString()}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No resource usage data available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Parameters Tab */}
        {activeTab === 'parameters' && (
          <Box mt={2}>
            {job.parameters && Object.keys(job.parameters).length > 0 ? (
              <Box sx={{ 
                backgroundColor: '#f5f5f5', 
                p: 2, 
                borderRadius: 1,
                maxHeight: '50vh',
                overflow: 'auto'
              }}>
                <pre>{JSON.stringify(job.parameters, null, 2)}</pre>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No parameters for this job</Typography>
            )}
          </Box>
        )}
        
        {/* Results Tab */}
        {activeTab === 'results' && (
          <Box mt={2}>
            {job.results ? (
              <>
                {job.results.outputs && Object.keys(job.results.outputs).length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom>Outputs</Typography>
                    <Box sx={{ 
                      backgroundColor: '#f5f5f5', 
                      p: 2, 
                      borderRadius: 1,
                      maxHeight: '30vh',
                      overflow: 'auto',
                      mb: 3
                    }}>
                      <pre>{JSON.stringify(job.results.outputs, null, 2)}</pre>
                    </Box>
                  </>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No results available
              </Typography>
            )}
          </Box>
        )}
        
        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <Box mt={2} height="60vh">
            {loading ? (
              <CircularProgress />
            ) : (
              <MonacoEditor
                height="100%"
                language="plaintext"
                value={logs}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            )}
          </Box>
        )}
        
        {/* Errors Tab */}
        {activeTab === 'errors' && job.errors && (
          <Box mt={2}>
            {job.errors.map((err, index) => (
              <Alert 
                key={index}
                severity="error"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1">{err.code}</Typography>
                <Typography variant="body2">{err.message}</Typography>
                {err.details && (
                  <Box mt={1} sx={{ 
                    backgroundColor: 'rgba(0,0,0,0.04)', 
                    p: 1, 
                    borderRadius: 1,
                    maxHeight: '20vh',
                    overflow: 'auto'
                  }}>
                    <pre>{JSON.stringify(err.details, null, 2)}</pre>
                  </Box>
                )}
                <Typography variant="caption" display="block" mt={1}>
                  Time: {new Date(err.timestamp).toLocaleString()}
                </Typography>
              </Alert>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default JobDetails;