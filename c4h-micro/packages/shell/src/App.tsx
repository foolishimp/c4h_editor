// File: c4h-micro/packages/shell/src/App.tsx
import React, { Suspense, useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navigation from './components/common/Navigation';
import { RemoteComponent } from 'shared';
import ConfigTypeSelector from './components/create/ConfigTypeSelector';

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

// Preload microfrontends helper function
const preloadMicrofrontend = async (url: string, scope: string) => {
  try {
    // Create and append a script element
    const script = document.createElement('script');
    script.src = url;
    script.type = 'text/javascript';
    script.async = true;
    
    // Create a promise that resolves when the script loads
    const loaded = new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = (err) => reject(new Error(`Failed to preload ${url}: ${err}`));
    });
    
    // Append the script to the document
    document.head.appendChild(script);
    
    // Wait for the script to load
    await loaded;
    
    // Try to initialize the container if it has an init function
    if (window[scope]?.init) {
      await window[scope].init({
        react: { 
          '18.3.1': { 
            get: () => Promise.resolve(() => require('react')),
            loaded: true
          } 
        },
        'react-dom': { 
          '18.3.1': { 
            get: () => Promise.resolve(() => require('react-dom')),
            loaded: true
          } 
        }
      });
    }
    
    console.log(`✅ Preloaded ${scope} successfully`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to preload ${scope}:`, err);
    return false;
  }
};

// Main App component
function App() {
  const drawerWidth = 240;
  const [remotesLoaded, setRemotesLoaded] = useState(false);
  
  // Preload all remote entries when the app starts
  useEffect(() => {
    const loadAllRemotes = async () => {
      try {
        console.log('Preloading remotes...');
        
        // Try to load all remotes in parallel
        await Promise.all([
          preloadMicrofrontend('http://localhost:3001/remoteEntry.js', 'configEditor'),
          preloadMicrofrontend('http://localhost:3002/remoteEntry.js', 'yamlEditor'),
          preloadMicrofrontend('http://localhost:3003/remoteEntry.js', 'configSelector'),
          preloadMicrofrontend('http://localhost:3004/remoteEntry.js', 'jobManagement')
        ]);
        
        setRemotesLoaded(true);
        console.log('All remotes preloaded successfully!');
      } catch (err) {
        console.error('Error preloading remotes:', err);
        // We'll continue anyway, the RemoteComponent will handle retries
        setRemotesLoaded(true);
      }
    };
    
    loadAllRemotes();
  }, []);

  if (!remotesLoaded) {
    return <Loading />;
  }

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
                    element={
                      <RemoteComponent
                        url="http://localhost:3003/remoteEntry.js"
                        scope="configSelector"
                        module="./ConfigManager"
                      />
                    } 
                  />
                  <Route 
                    path="/configs/:configType/:id" 
                    element={
                      <RemoteComponent
                        url="http://localhost:3003/remoteEntry.js"
                        scope="configSelector"
                        module="./ConfigManager"
                      />
                    } 
                  />
                  
                  {/* Job management routes */}
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
                  <Route 
                    path="/jobs/:id" 
                    element={
                      <RemoteComponent
                        url="http://localhost:3004/remoteEntry.js"
                        scope="jobManagement"
                        module="./JobManager"
                      />
                    } 
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