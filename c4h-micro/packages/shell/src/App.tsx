// File: packages/shell/src/App.tsx
import React, { Suspense, lazy, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
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
          <h2>Something went wrong</h2>
          <p>There was an error loading the component</p>
          <pre>{this.state.error?.toString()}</pre>
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
  
  // Make remotes globally available for better error handling
  useEffect(() => {
    console.log('Available remotes:', remotes);
  }, []);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <Navigation drawerWidth={drawerWidth} />
          <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: `${drawerWidth}px` }}>
            <ErrorBoundary>
              <Suspense fallback={<Loading />}>
                <Routes>
                  {/* Home route redirects to configs */}
                  <Route path="/" element={<Navigate to="/configs/workorder" replace />} />
                  
                  {/* Config management routes */}
                  <Route path="/configs/create" element={<ConfigTypeSelector />} />
                  <Route 
                    path="/configs/:configType" 
                    element={<ConfigManagerWrapper />} 
                  />
                  <Route 
                    path="/configs/:configType/:id" 
                    element={<ConfigManagerWrapper />} 
                  />
                  
                  {/* Job management routes */}
                  <Route 
                    path="/jobs" 
                    element={<JobManager />} 
                  />
                  <Route 
                    path="/jobs/:id" 
                    element={<JobManager />} 
                  />
                  
                  {/* Fallback for unknown routes */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;