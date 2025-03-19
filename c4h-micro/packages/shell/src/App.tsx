// File: packages/shell/src/App.tsx
import React, { Suspense, lazy } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navigation from './components/common/Navigation';
import ConfigTypeSelector from './components/create/ConfigTypeSelector';
import RemoteComponent from './utils/RemoteComponent';
import { remotes } from 'shared';

// Legacy components (for backward compatibility)
import WorkOrderList from './components/WorkOrderList/WorkOrderList';

// Lazy load remote components
const ConfigEditor = lazy(() => 
  import('configEditor/ConfigEditor').catch(err => {
    console.error("Failed to load ConfigEditor microfrontend:", err);
    return { default: () => <div>Failed to load ConfigEditor</div> };
  })
);

const ConfigManager = lazy(() => 
  import('configSelector/ConfigManager').catch(err => {
    console.error("Failed to load ConfigSelector microfrontend:", err);
    return { default: () => <div>Failed to load ConfigSelector</div> };
  })
);

const JobManager = lazy(() => 
  import('jobManagement/JobManager').catch(err => {
    console.error("Failed to load JobManager microfrontend:", err);
    return { default: () => <div>Failed to load JobManager</div> };
  })
);

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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <Navigation drawerWidth={drawerWidth} />
          <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
            <ErrorBoundary>
              <Suspense fallback={<Loading />}>
                <Routes>
                  {/* New routes for the config-driven approach */}
                  <Route path="/" element={<Navigate to="/configs/workorder" replace />} />
                  
                  {/* Config management routes */}
                  <Route path="/configs/create" element={<ConfigTypeSelector />} />
                  <Route path="/configs/:configType" element={<ConfigManager />} />
                  <Route path="/configs/:configType/:id" element={<ConfigManager />} />
                  
                  {/* Job management routes */}
                  <Route path="/jobs" element={<JobManager />} />
                  <Route path="/jobs/:id" element={<JobManager />} />
                  
                  {/* Legacy routes for backward compatibility */}
                  <Route path="/workorders" element={<WorkOrderList />} />
                  <Route path="/workorders/new" element={<ConfigEditor />} />
                  <Route path="/workorders/:id" element={<ConfigEditor />} />
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
