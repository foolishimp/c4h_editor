// File: packages/shared/src/components/RemoteComponent.tsx
import React, { useState, useEffect, useRef } from 'react';
import { CircularProgress, Typography, Box, Button, Alert, Paper } from '@mui/material';

interface RemoteComponentProps {
  url?: string;
  scope: string;
  module: string;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
}

/**
 * Enhanced component for loading and rendering Vite federated modules
 * 
 * This implementation properly handles Vite's ES module federation approach,
 * which differs from Webpack Module Federation.
 */
const RemoteComponent: React.FC<RemoteComponentProps> = ({
  url,
  scope,
  module,
  props = {},
  fallback
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  
  // Store the module loader promise to avoid multiple loads
  const moduleLoader = useRef<Promise<any> | null>(null);

  // Add diagnostic info for debugging
  const addDiagnostic = (message: string) => {
    console.log(`[RemoteComponent] ${message}`);
    setDiagnostics(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };

  // Dynamically import the remote container module
  const getContainer = async (remoteUrl: string) => {
    if (moduleLoader.current) {
      return moduleLoader.current;
    }
    
    addDiagnostic(`Importing remote module from: ${remoteUrl}`);
    
    // Create a new promise that will resolve with the container
    moduleLoader.current = new Promise<any>((resolve, reject) => {
      try {
        // Using dynamic import with the @vite-ignore comment to bypass Vite's import analysis
        import(/* @vite-ignore */ remoteUrl)
          .then(container => {
            addDiagnostic(`Remote container loaded successfully: ${Object.keys(container).join(', ')}`);
            resolve(container);
          })
          .catch(err => {
            addDiagnostic(`Failed to load remote container: ${err.message}`);
            moduleLoader.current = null; // Clear for retry
            reject(err);
          });
      } catch (err: any) {
        addDiagnostic(`Error during import: ${err.message}`);
        moduleLoader.current = null; // Clear for retry
        reject(err);
      }
    });
    
    return moduleLoader.current;
  };

  // Load the component from the container
  const loadComponent = async () => {
    if (!url) {
      // Get the URL from the shared config if not provided
      try {
        const remotes = await import('../config/remotes');
        
        // Type-safe access to remotes object
        const remotesObj = remotes.default || remotes.remotes || {};
        const remoteUrl = remotesObj[scope as keyof typeof remotesObj];
        
        if (!remoteUrl) {
          throw new Error(`Remote URL not found for scope '${scope}'`);
        }
        
        await loadRemoteComponent(remoteUrl);
      } catch (err: any) {
        addDiagnostic(`Error loading remote URL from config: ${err.message}`);
        setError(`Failed to load remote URL for '${scope}': ${err.message}`);
        setLoading(false);
      }
    } else {
      await loadRemoteComponent(url);
    }
  };

  // Load remote component from the specified URL
  const loadRemoteComponent = async (remoteUrl: string) => {
    try {
      addDiagnostic(`Loading module '${module}' from scope '${scope}' at ${remoteUrl}`);
      
      // Get the container module
      const container = await getContainer(remoteUrl);
      
      // Check if the container has the required methods
      if (typeof container.get !== 'function') {
        throw new Error(`Remote container for '${scope}' does not have a get method`);
      }
      
      // Get the factory function for the requested module
      addDiagnostic(`Getting module '${module}' from container`);
      const factory = await container.get(module);
      
      if (!factory) {
        throw new Error(`Module '${module}' not found in '${scope}' container`);
      }
      
      // Initialize the module with shared dependencies
      addDiagnostic('Executing factory function to get the component');
      const moduleExports = await factory();
      
      // Get the default export or the module itself
      const ComponentImpl = moduleExports.default || moduleExports;
      
      if (!ComponentImpl) {
        throw new Error(`Component not found in module '${module}'`);
      }
      
      addDiagnostic('Component loaded successfully');
      setComponent(() => ComponentImpl);
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading remote component:', err);
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      addDiagnostic(`Error: ${errorMessage}`);
      
      // Add specific diagnostics for common errors
      if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
        addDiagnostic('CORS error detected - make sure server allows cross-origin requests');
      }
      
      if (errorMessage.includes('undefined is not an object') && errorMessage.includes('useState')) {
        addDiagnostic('React hooks error detected - This often happens when multiple React instances are loaded');
        addDiagnostic('Check that React is properly shared between host and remote');
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Load the component on mount and when dependencies change
  useEffect(() => {
    setLoading(true);
    setError(null);
    setDiagnostics([]);
    setComponent(null);
    moduleLoader.current = null;
    
    loadComponent();
    
    // Cleanup
    return () => {
      moduleLoader.current = null;
    };
  }, [url, scope, module]);

  // Handler for retrying the load
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setDiagnostics([]);
    setRetryCount(prev => prev + 1);
    moduleLoader.current = null;
    
    // Add cache busting
    const cacheBustUrl = url ? `${url}?t=${Date.now()}` : undefined;
    
    if (cacheBustUrl) {
      addDiagnostic(`Retrying with cache-busting URL: ${cacheBustUrl}`);
      loadRemoteComponent(cacheBustUrl);
    } else {
      addDiagnostic('Retrying load from config');
      loadComponent();
    }
  };

  // Render loading state
  if (loading) {
    return fallback || (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', border: '1px solid #f5f5f5', borderRadius: 2 }}>
        <Typography variant="h6" color="error" gutterBottom>
          Failed to load component
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {error}
        </Typography>
        
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2">
            This could be because:
          </Typography>
          <ul style={{ textAlign: 'left' }}>
            <li>The microfrontend server is not running</li>
            <li>There's a CORS issue preventing cross-origin requests</li>
            <li>The module or scope name is incorrect</li>
            <li>React is not properly shared between applications</li>
          </ul>
        </Box>
        
        {diagnostics.length > 0 && (
          <Alert severity="info" sx={{ mb: 2, textAlign: 'left', maxHeight: '300px', overflow: 'auto' }}>
            <Typography variant="subtitle2">Diagnostics:</Typography>
            <ul style={{ marginTop: 4, paddingLeft: 16 }}>
              {diagnostics.map((msg, idx) => (
                <li key={idx}><Typography variant="caption">{msg}</Typography></li>
              ))}
            </ul>
          </Alert>
        )}
        
        <Button 
          variant="contained" 
          onClick={handleRetry} 
          sx={{ mr: 2 }}
          disabled={retryCount >= 3}
        >
          Retry Loading ({retryCount}/3)
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()} 
        >
          Reload Page
        </Button>
      </Paper>
    );
  }

  // Render the component if it was loaded successfully
  if (!Component) {
    return null;
  }

  // Render the component with the provided props
  return <Component {...props} />;
};

export default RemoteComponent;