// File: c4h-micro/packages/shared/src/components/RemoteComponent.tsx
import React, { useState, useEffect } from 'react';
import { CircularProgress, Typography, Box, Button, Alert, Paper } from '@mui/material';

interface RemoteComponentProps {
  url: string;
  scope: string;
  module: string;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
}

/**
 * Component for loading and rendering Vite federated modules
 */
const RemoteComponent: React.FC<RemoteComponentProps> = ({
  url,
  scope, // Not used for Vite federation, but kept for API compatibility
  module,
  props = {},
  fallback
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  const addDiagnostic = (message: string) => {
    console.log(`[RemoteComponent] ${message}`);
    setDiagnostics(prev => [...prev, message]);
  };

  // Load component using Vite's direct import approach
  const loadComponent = async () => {
    try {
      addDiagnostic(`Loading remote module '${module}' from '${url}'`);
      
      // Use dynamic import
      const container = await import(/* @vite-ignore */ url);
      addDiagnostic(`Module imported successfully, exports: ${Object.keys(container).join(', ')}`);
      
      // Validate the container has the necessary methods
      if (typeof container.get !== 'function') {
        throw new Error('Remote module does not have a get method');
      }
      
      // Get the factory function
      addDiagnostic(`Getting module '${module}'...`);
      const factory = await container.get(module);
      
      if (!factory) {
        throw new Error(`Module '${module}' not found in remote container`);
      }
      
      addDiagnostic('Factory function retrieved, loading component...');
      const Module = await factory();
      
      // Get the component (could be default export or the module itself)
      const Component = Module.default || Module;
      
      if (!Component) {
        throw new Error('Component not found in module');
      }
      
      addDiagnostic('Component loaded successfully');
      setComponent(() => Component);
      setLoading(false);
    } catch (err: unknown) {
      console.error('Error loading remote component:', err);
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      addDiagnostic(`Error: ${errorMessage}`);
      
      // Check for CORS errors
      if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
        addDiagnostic('CORS error detected, make sure server allows cross-origin requests');
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    setDiagnostics([]);
    setComponent(null);
    
    loadComponent();
  }, [url, module]); // Removed scope dependency since it's not used

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setDiagnostics([]);
    setRetryCount(prev => prev + 1);
    
    // Add cache busting to URL
    const cacheBustUrl = `${url}?t=${Date.now()}`;
    addDiagnostic(`Retrying with cache-busting URL: ${cacheBustUrl}`);
    
    // Load with the cache-busting URL
    const retryLoad = async () => {
      try {
        const container = await import(/* @vite-ignore */ cacheBustUrl);
        addDiagnostic(`Retry import successful, exports: ${Object.keys(container).join(', ')}`);
        
        if (typeof container.get !== 'function') {
          throw new Error('Remote module does not have a get method (retry)');
        }
        
        const factory = await container.get(module);
        
        if (!factory) {
          throw new Error(`Module '${module}' not found in remote container (retry)`);
        }
        
        const Module = await factory();
        const Component = Module.default || Module;
        
        addDiagnostic('Component loaded successfully on retry');
        setComponent(() => Component);
        setLoading(false);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        addDiagnostic(`Error on retry: ${errorMessage}`);
        setError(errorMessage);
        setLoading(false);
      }
    };
    
    retryLoad();
  };

  if (loading) {
    return fallback || (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

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
            <li>The microfrontend server at <code>{url}</code> is not running</li>
            <li>The remoteEntry.js file is using a different federation format than expected</li>
            <li>There's a network issue preventing the connection</li>
            <li>The module name is incorrect</li>
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
          disabled={retryCount > 5}
        >
          Retry Loading ({retryCount}/5)
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

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
};

export default RemoteComponent;