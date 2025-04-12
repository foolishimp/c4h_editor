import React, { Suspense, lazy, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography } from '@mui/material'; // Ensure Grid and Typography are imported
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';

import Navigation from './components/common/Navigation';
import { remotes } from 'shared';
import ConfigTypeSelector from './components/create/ConfigTypeSelector';

// Lazy load remote components
const ConfigManager = lazy(() => import('configSelector/ConfigManager'));
const JobManager = lazy(() => import('jobManagement/JobManager'));

// Wrapper component to capture and pass URL params
const ConfigManagerWrapper = () => {
  const { configType, id } = useParams();
  // Ensure props are passed correctly if ConfigManager expects them directly
  return <ConfigManager configType={configType} configId={id} />;
};

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
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // You can also log the error to an error reporting service
    console.error("Error in component:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>There was an error loading this part of the application.</p>
          <pre>{this.state.error?.toString()}</pre>
          <button onClick={() => this.setState({ hasError: false, error: null })}>Try again</button>
          {' '}
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </Box>
      );
    }

    return this.props.children;
  }
}


// Main App component
function App() {
  const drawerWidth = 240;
  // Increase sidebar width by ~30% (adjust as needed)
  const jobsSidebarWidth = Math.round(350 * 1.3); // Approx 455px

  // Make remotes globally available for better error handling
  useEffect(() => {
    console.log('Available remotes:', remotes);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}> {/* Ensure outer box takes full height and hides overflow */}
          {/* AppBar and Left Drawer */}
          <Navigation drawerWidth={drawerWidth} />

          {/* Main Content Area (to the right of Drawer) */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              mt: 8, // AppBar height (assuming 64px)
              ml: `${drawerWidth}px`, // Left Drawer width
              height: 'calc(100vh - 64px)', // Full height below AppBar
              display: 'flex', // Use flexbox for the main content columns
              overflow: 'hidden' // Prevent overall page scroll
            }}
          >
            {/* Container for Middle Area Column + Right Sidebar Column */}
            {/* Using Flexbox for the two main columns instead of Grid */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Middle-Top Pane */}
              <Box sx={{ flexBasis: '50%', overflowY: 'auto', p: 3, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <ErrorBoundary>
                  <Suspense fallback={<Loading />}>
                    {/* Routes for editors usually go in one pane */}
                    <Routes>
                      <Route path="/" element={<Navigate to="/configs/workorder" replace />} />
                      <Route path="/configs/create" element={<ConfigTypeSelector />} />
                      <Route path="/configs/:configType" element={<ConfigManagerWrapper />} />
                      <Route path="/configs/:configType/:id" element={<ConfigManagerWrapper />} />
                      {/* Job detail route might need specific handling now */}
                      <Route path="/jobs/:id" element={<JobManager />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </Box>

              {/* Middle-Bottom Pane */}
              <Box sx={{ flexBasis: '50%', overflowY: 'auto', p: 3 }}>
                 <ErrorBoundary>
                   <Suspense fallback={<Loading/>}>
                      {/* Content for the second middle pane goes here */}
                      <Typography variant="h6">Middle Pane Bottom</Typography>
                      {/* Example: Load another app/component here */}
                   </Suspense>
                 </ErrorBoundary>
              </Box>
            </Box>

            {/* Right Jobs Sidebar (Wider) */}
            <Box
              sx={{
                width: `${jobsSidebarWidth}px`, // Use updated width
                flexShrink: 0,
                borderLeft: '1px solid rgba(0, 0, 0, 0.12)', // Visual divider
                height: '100%',
                overflowY: 'auto', // Allow scrolling within the sidebar
                p: 2 // Add some padding
              }}
            >
              <ErrorBoundary>
                <Suspense fallback={<Loading />}>
                  <JobManager />
                </Suspense>
              </ErrorBoundary>
            </Box>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;