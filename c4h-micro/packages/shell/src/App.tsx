// File: packages/shell/src/App.tsx
import React, { Suspense, useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress, Alert } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navigation from './components/common/Navigation';
import { RemoteComponent } from 'shared';

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
          <button onClick={() => this.setState({ hasError: false, error: null })}>Try Again</button>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Simplified test component
const TestComponent = () => {
  const [count, setCount] = useState(0);
  const [reactInfo, setReactInfo] = useState<string>('');
  
  useEffect(() => {
    // Display current React version info
    setReactInfo(`React version: ${React.version}`);
  }, []);
  
  return (
    <Box sx={{ p: 3 }}>
      <h2>React Test Component</h2>
      <p>This component verifies that local React hooks are working properly.</p>
      <p>{reactInfo}</p>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </Box>
  );
};

// Main App component
function App() {
  const drawerWidth = 240;
  const [federationReady, setFederationReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if Module Federation is initialized
    // Use type assertion to access the federation shared property
    const win = window as unknown as { __federation_shared__?: unknown };
    
    if (win.__federation_shared__) {
      setFederationReady(true);
    } else {
      // Set a small delay to check again
      const timer = setTimeout(() => {
        if (win.__federation_shared__) {
          setFederationReady(true);
        } else {
          setError('Module Federation failed to initialize. Shared modules not found.');
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <Navigation drawerWidth={drawerWidth} />
          <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: `${drawerWidth}px` }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            {/* Show federation status */}
            {federationReady && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Module Federation initialized successfully
              </Alert>
            )}
            
            <ErrorBoundary>
              <Suspense fallback={<Loading />}>
                {/* Simple test route to verify local React hooks */}
                <Routes>
                  {/* Local component to test React */}
                  <Route path="/test" element={<TestComponent />} />
                  
                  {/* Simple remote component test */}
                  <Route
                    path="/simple-job"
                    element={
                      <RemoteComponent
                        url="http://localhost:3004/remoteEntry.js"
                        scope="jobManagement"
                        module="./JobManager"
                      />
                    }
                  />
                  
                  {/* Regular routes */}
                  <Route path="/" element={<Navigate to="/test" replace />} />
                  
                  <Route 
                    path="/jobs" 
                    element={
                      <RemoteComponent
                        url="http://localhost:3004/remoteEntry.js"
                        scope="jobManagement"
                        module="./JobManager"
                      />
                    } 
                  />
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