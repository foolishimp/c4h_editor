// File: c4h-micro/packages/shared/src/components/RemoteComponent.tsx
import React from 'react';
import { CircularProgress, Typography, Box, Button, Alert, Paper } from '@mui/material';

interface RemoteComponentProps {
  url: string;
  scope: string;
  module: string;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
}

// Define types for federation-related objects
interface Container {
  init?: (shareScope: any) => Promise<void>;
  get?: (module: string) => Promise<() => any>;
  [key: string]: any;
}

// Augment the window interface
declare global {
  interface Window {
    [key: string]: any;
  }
  
  var __federation_shared__: {
    default?: Record<string, any>;
    [key: string]: any;
  };
}

// Flag to enable detailed debug logging
const DEBUG_MODE = true; // Set to true for troubleshooting

// Helper function for logging
const logDebug = (message: string, ...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(`[RemoteComponent] ${message}`, ...args);
  }
};

class RemoteComponent extends React.Component<RemoteComponentProps, { 
  loading: boolean, 
  error: string | null, 
  Component: React.ComponentType<any> | null,
  retryCount: number,
  diagnostics: string[]
}> {
  constructor(props: RemoteComponentProps) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      Component: null,
      retryCount: 0,
      diagnostics: []
    };
  }

  componentDidMount() {
    this.loadComponent();
  }

  componentDidUpdate(prevProps: RemoteComponentProps) {
    // Reload component if any of these props change
    if (prevProps.url !== this.props.url || 
        prevProps.scope !== this.props.scope || 
        prevProps.module !== this.props.module) {
      this.setState({ 
        loading: true, 
        Component: null, 
        retryCount: 0, 
        diagnostics: [], 
        error: null 
      }, this.loadComponent);
    }
  }

  addDiagnostic(message: string) {
    logDebug(message);
    this.setState(prevState => ({
      diagnostics: [...prevState.diagnostics, message]
    }));
  }

  async loadComponent() {
    const { url, scope, module } = this.props;
    
    try {
      this.addDiagnostic(`Loading remote module '${module}' from scope '${scope}' at URL '${url}'`);
      
      // Check if the container is already loaded in window object
      const containerExists = typeof window !== 'undefined' && Boolean(window[scope]);
      this.addDiagnostic(`Container already exists in window: ${containerExists}`);
      
      if (!containerExists) {
        // Load the remote entry script
        this.addDiagnostic('Container not found, loading script...');
        
        // MODIFICATION: First check if the remote is accessible
        try {
          const checkResponse = await fetch(url, { method: 'HEAD' });
          if (!checkResponse.ok) {
            throw new Error(`Remote returned status ${checkResponse.status}`);
          }
          this.addDiagnostic(`Remote URL is accessible with status: ${checkResponse.status}`);
        } catch (checkError) {
          this.addDiagnostic(`Remote URL check failed: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
          // Continue anyway, the script loading might still succeed
        }
        
        await this.loadRemoteEntryScript(url);
      }
      
      // Re-check if container was properly loaded
      if (typeof window === 'undefined' || !window[scope]) {
        throw new Error(`Failed to load remote container '${scope}' from '${url}'`);
      }
      
      // Get the container
      const container = window[scope] as Container;
      
      // Check for initialization method (Vite vs Webpack style)
      if (typeof container.init === 'function') {
        this.addDiagnostic('Initializing container with Vite federation...');
        
        // Ensure global shared scope exists
        if (!globalThis.__federation_shared__) {
          globalThis.__federation_shared__ = { default: {} };
        }
        
        if (!globalThis.__federation_shared__.default) {
          globalThis.__federation_shared__.default = {};
        }
        
        // Initialize using Vite federation approach
        await container.init(globalThis.__federation_shared__.default);
      } else {
        this.addDiagnostic('Container does not have init method, might be using non-standard federation');
      }
      
      // Get the module from the container
      let moduleFactory;
      if (typeof container.get === 'function') {
        this.addDiagnostic(`Getting module '${module}' from container...`);
        moduleFactory = await container.get(module);
      } else {
        throw new Error(`Container '${scope}' is loaded but doesn't expose a 'get' method for federation`);
      }
      
      if (!moduleFactory) {
        throw new Error(`Module '${module}' not found in remote container '${scope}'`);
      }
      
      // Get the actual component from the factory
      const ModuleContent = await moduleFactory();
      
      this.addDiagnostic(`Module loaded successfully, found keys: ${Object.keys(ModuleContent).join(', ')}`);
      
      const Component = ModuleContent.default || ModuleContent;
      
      if (!Component) {
        throw new Error(`Module '${module}' loaded but doesn't export a default or named component`);
      }
      
      this.setState({
        loading: false,
        Component,
        error: null
      });
    } catch (error) {
      console.error('Error loading remote component:', error);
      
      this.setState(prevState => ({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load component',
        retryCount: prevState.retryCount + 1,
        diagnostics: [...prevState.diagnostics, `Error: ${error instanceof Error ? error.message : String(error)}`]
      }));
    }
  }

  async loadRemoteEntryScript(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const startTime = performance.now();
      
      // MODIFICATION: Check if there's an existing script with the same URL
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (existingScript) {
        this.addDiagnostic(`Found existing script tag for ${url}, removing it to retry loading`);
        existingScript.remove();
      }
      
      const script = document.createElement('script');
      script.src = url;
      script.type = 'text/javascript';
      script.async = true;
      script.crossOrigin = 'anonymous'; // Add cross-origin attribute
      
      script.onload = () => {
        const loadTime = Math.round(performance.now() - startTime);
        this.addDiagnostic(`Script loaded successfully in ${loadTime}ms`);
        resolve();
      };
      
      script.onerror = (event) => {
        this.addDiagnostic(`Script failed to load: ${url}, error type: ${event.type}`);
        reject(new Error(`Failed to load remote entry script: ${url}`));
      };
      
      document.head.appendChild(script);
      this.addDiagnostic(`Script tag appended to document head: ${url}`);
    });
  }

  checkContainerHealth() {
    const { scope } = this.props;
    
    // Various checks to diagnose federation issues
    const diagnostics: string[] = [];
    
    try {
      if (typeof window !== 'undefined') {
        // Check container existence
        diagnostics.push(`Container exists: ${Boolean(window[scope])}`);
        
        if (window[scope]) {
          const container = window[scope] as Container;
          // Check container methods
          diagnostics.push(`Container has 'get' method: ${typeof container.get === 'function'}`);
          diagnostics.push(`Container has 'init' method: ${typeof container.init === 'function'}`);
          
          // Check global federation scopes
          diagnostics.push(`Global federation scope exists: ${Boolean(globalThis.__federation_shared__)}`);
        }
      }
    } catch (e) {
      diagnostics.push(`Error checking container health: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    return diagnostics;
  }

  handleRetry = () => {
    this.setState({ loading: true, error: null, diagnostics: [] }, this.loadComponent);
  }

  render() {
    const { fallback, props = {} } = this.props;
    const { loading, error, Component, retryCount, diagnostics } = this.state;
    
    if (loading) {
      return fallback || (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      const healthDiagnostics = this.checkContainerHealth();
      
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
              <li>The microfrontend server at <code>{this.props.url}</code> is not running</li>
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
                {healthDiagnostics.map((msg, idx) => (
                  <li key={`health-${idx}`}><Typography variant="caption">{msg}</Typography></li>
                ))}
              </ul>
            </Alert>
          )}
          
          <Button 
            variant="contained" 
            onClick={this.handleRetry} 
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
  }
}

export default RemoteComponent;