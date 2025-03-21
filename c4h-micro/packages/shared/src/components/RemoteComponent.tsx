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

declare global {
  interface Window {
    [key: string]: any;
  }
}

/**
 * Component for loading and rendering federated modules
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    setDiagnostics([]);
    setComponent(null);
    
    // Dynamic import approach - the most reliable for Vite federation
    const loadComponent = async () => {
      try {
        addDiagnostic(`Loading remote module '${module}' from scope '${scope}' at URL '${url}'`);
        
        // For Vite Module Federation, we use dynamic import instead of script loading
        const container = await import(/* @vite-ignore */ url);
        
        if (!container) {
          throw new Error(`Failed to load remote container from '${url}'`);
        }
        
        addDiagnostic(`Container loaded successfully`);
        
        // Get the specific module from the container
        let Component;
        
        if (module.startsWith('./')) {
          // Handle the path-style module references
          const moduleName = module.replace('./', '');
          Component = container[moduleName] || null;
        } else {
          Component = container[module] || null;
        }
        
        if (!Component) {
          throw new Error(`Module '${module}' not found in remote container`);
        }
        
        addDiagnostic(`Module component loaded successfully`);
        
        setComponent(() => Component);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load remote component:', err);
        
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setRetryCount(prev => prev + 1);
        addDiagnostic(`Error: ${errorMessage}`);
        setLoading(false);
      }
    };
    
    loadComponent();
  }, [url, scope, module]);

  const addDiagnostic = (message: string) => {
    console.log(`[RemoteComponent] ${message}`);
    setDiagnostics(prev => [...prev, message]);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setDiagnostics([]);
    setRetryCount(prev => prev + 1);
    
    // Use the import approach again
    const retryLoad = async () => {
      try {
        addDiagnostic(`Retrying to load remote module '${module}' from '${url}'`);
        
        // Clear browser cache for this URL if possible
        const cache = await caches.open('remote-components');
        await cache.delete(url).catch(() => {});
        
        const container = await import(/* @vite-ignore */ `${url}?t=${Date.now()}`);
        
        if (!container) {
          throw new Error(`Failed to load remote container from '${url}'`);
        }
        
        addDiagnostic(`Container loaded successfully on retry`);
        
        // Get the specific module from the container
        let Component;
        
        if (module.startsWith('./')) {
          const moduleName = module.replace('./', '');
          Component = container[moduleName] || null;
        } else {
          Component = container[module] || null;
        }
        
        if (!Component) {
          throw new Error(`Module '${module}' not found in remote container`);
        }
        
        setComponent(() => Component);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load remote component on retry:', err);
        
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        addDiagnostic(`Error on retry: ${errorMessage}`);
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
            <li>The module name or scope is incorrect</li>
          </ul>
        </Box>
        
        {diagnostics.length > 0 && (
          <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
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