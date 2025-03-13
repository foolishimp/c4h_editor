// File: frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navigation from './components/common/Navigation';
import { PromptLibrary } from './components/PromptLibrary/PromptLibrary';
import { WorkOrderEditor } from './components/WorkOrderEditor/WorkOrderEditor';
import { JobsList } from './components/JobsList/JobsList';
import { JobDetails } from './components/JobDetails/JobDetails';

import { usePromptApi } from './hooks/usePromptApi';
import { useWorkOrderApi } from './hooks/useWorkOrderApi';
import { useJobApi } from './hooks/useJobApi';
import { Job } from './types/job';
import { WorkOrder } from './types/workorder';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f7fa',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'Open Sans',
      'Helvetica Neue',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { jobs, fetchJobs, submitJob, cancelJob } = useJobApi();
  const { workOrders, fetchWorkOrders } = useWorkOrderApi();

  // Fetch jobs and workorders on load
  useEffect(() => {
    fetchJobs();
    fetchWorkOrders();
  }, [fetchJobs, fetchWorkOrders]);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleCloseJobDetails = () => {
    setSelectedJobId(null);
  };

  const handleCancelJob = (jobId: string) => {
    cancelJob(jobId).then(() => {
      fetchJobs(); // Refresh the jobs list
    });
  };

  const handleSubmitJob = (workOrderId: string) => {
    submitJob({ work_order_id: workOrderId }).then(() => {
      fetchJobs(); // Refresh the jobs list
    });
  };

  const handleRefreshJobs = () => {
    fetchJobs();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <Navigation />
          <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/prompts" replace />} />
              <Route path="/prompts" element={<PromptLibrary />} />
              <Route path="/prompts/:id" element={<PromptLibrary />} />
              <Route path="/workorders" element={<WorkOrderEditor />} />
              <Route path="/workorders/:id" element={<WorkOrderEditor />} />
              <Route path="/jobs" element={
                <>
                  <JobsList 
                    jobs={jobs} 
                    workOrders={workOrders} 
                    onSelect={handleJobSelect} 
                    onSubmitJob={handleSubmitJob} 
                    onRefresh={handleRefreshJobs} 
                  />
                  {selectedJobId && (
                    <JobDetails 
                      jobId={selectedJobId} 
                      onClose={handleCloseJobDetails} 
                      onCancel={handleCancelJob} 
                    />
                  )}
                </>
              } />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;