// File: packages/shell/src/App.tsx
/**
 * Main App component for the shell application
 * Orchestrates all microfrontends and handles routing
 */
import React, { lazy, Suspense } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navigation from './components/common/Navigation';
import WorkOrderList from './components/WorkOrderList/WorkOrderList';
import JobsList from './components/JobsList/JobsList';
import { JobDetails } from './components/JobDetails/JobDetails';

// Import the useEventBus hook instead of the HOC
import { useEventBus } from './utils/eventListener';

// Lazy load the ConfigEditor from remote
const ConfigEditor = lazy(() => import('configEditor/ConfigEditor').catch(err => {
  console.error("Failed to load ConfigEditor microfrontend:", err);
  return { default: () => <div>Failed to load ConfigEditor component</div> };
}));

// Create theme
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

// Create a loading component for Suspense fallback
const Loading = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

// Main App component
function App() {
  // Use our event bus hook to set up event listeners
  useEventBus();
  
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleCloseJobDetails = () => {
    setSelectedJobId(null);
  };

  const handleCancelJob = (jobId: string) => {
    console.log('Cancel job:', jobId);
    // Implementation will be handled by JobsList component
  };

  const handleRefreshJobs = () => {
    console.log('Refresh jobs');
    // Implementation will be handled by JobsList component
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <Navigation />
          <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/workorders" replace />} />
              
              {/* WorkOrder list route */}
              <Route path="/workorders" element={<WorkOrderList />} />
              
              {/* WorkOrder editor routes - using remote microfrontend */}
              <Route path="/workorders/new" element={
                <Suspense fallback={<Loading />}>
                  <ConfigEditor />
                </Suspense>
              } />
              <Route path="/workorders/:id" element={
                <Suspense fallback={<Loading />}>
                  <ConfigEditor />
                </Suspense>
              } />
              
              {/* Job routes */}
              <Route path="/jobs" element={
                <>
                  <JobsList 
                    onSelect={handleJobSelect} 
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