// File: packages/shell/src/App.tsx
/**
 * Main App component for the shell application
 * Orchestrates all microfrontends and handles routing
 */
import React, { lazy, Suspense, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography, Button } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navigation from './components/common/Navigation';
import WorkOrderList from './components/WorkOrderList/WorkOrderList';
import JobsList from './components/JobsList/JobsList';
import { JobDetails } from './components/JobDetails/JobDetails';

// Import the useEventBus hook
import { useEventBus } from './utils/eventListener';

// Lazy load the ConfigEditor from remote
const ConfigEditor = lazy(() => import('configEditor/ConfigEditor').catch(err => {
  console.error("Failed to load ConfigEditor microfrontend:", err);
  // Return a fallback component
  return { default: () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '70vh' 
      }}
    >
      <Typography variant="h5" color="error" gutterBottom>
        Failed to load Config Editor
      </Typography>
      <Typography variant="body1">
        Please ensure the config-editor service is running on port 3001.
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2, mb: 2 }}>
        Error details: {err?.message || 'Unknown error'}
      </Typography>
      <Button 
        variant="contained" 
        onClick={() => window.location.reload()} 
        sx={{ mt: 2 }}
      >
        Retry
      </Button>
    </Box>
  ) };
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

// Set up custom error boundary to handle MF errors
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error in component:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            There was an error loading the component
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            {this.state.error?.toString()}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

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

  // Add debugging for module federation
  useEffect(() => {
    console.log('Attempting to load ConfigEditor module...');
  }, []);

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
                <ErrorBoundary>
                  <Suspense fallback={<Loading />}>
                    <ConfigEditor />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="/workorders/:id" element={
                <ErrorBoundary>
                  <Suspense fallback={<Loading />}>
                    <ConfigEditor />
                  </Suspense>
                </ErrorBoundary>
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