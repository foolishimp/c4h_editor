// File: frontend/src/App.tsx
import { useState } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navigation from './components/common/Navigation';
import WorkOrderEditor from './components/WorkOrderEditor/WorkOrderEditor';
import WorkOrderList from './components/WorkOrderList/WorkOrderList';
import JobsList from './components/JobsList/JobsList';
import { JobDetails } from './components/JobDetails/JobDetails';

// Create theme using createTheme from @mui/material/styles
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

// Create a component for the app content that will have access to the Router context
const AppContent = () => {
  // Now we can safely use hooks that depend on Router context
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleCloseJobDetails = () => {
    setSelectedJobId(null);
  };

  const handleCancelJob = (jobId: string) => {
    // Implementation will use hooks within Router context
    console.log('Cancel job:', jobId);
  };

  const handleRefreshJobs = () => {
    // Implementation will use hooks within Router context
    console.log('Refresh jobs');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Navigation />
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/workorders" replace />} />
          
          {/* WorkOrder routes */}
          <Route path="/workorders" element={<WorkOrderList />} />
          <Route path="/workorders/new" element={<WorkOrderEditor />} />
          <Route path="/workorders/:id" element={<WorkOrderEditor />} />
          
          {/* Job routes */}
          <Route
            path="/jobs"
            element={
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
            }
          />
        </Routes>
      </Box>
    </Box>
  );
};

// Main App component
function App() {
  console.log('App rendering, theme:', theme);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;