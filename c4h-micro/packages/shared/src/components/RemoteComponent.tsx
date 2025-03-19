// File: c4h-micro/packages/shared/src/components/RemoteComponent.tsx
import React from 'react';
import { CircularProgress, Typography, Box, Button } from '@mui/material';

interface RemoteComponentProps {
  url: string;
  scope: string;
  module: string;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
}

class RemoteComponent extends React.Component<RemoteComponentProps, { 
  loading: boolean, 
  error: string | null, 
  Component: React.ComponentType<any> | null,
  retryCount: number
}> {
  constructor(props: RemoteComponentProps) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      Component: null,
      retryCount: 0
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
      this.setState({ loading: true, Component: null, retryCount: 0 }, this.loadComponent);
    }
  }

  async loadComponent() {
    const { url, scope, module } = this.props;
    
    try {
      console.log(`Loading remote module ${scope} from ${url}`);
      
      // Check if the container is already loaded
      // @ts-ignore - federation types are not available
      if (!window[scope]) {
        // Load the script dynamically
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.type = 'text/javascript';
          script.async = true;
          
          script.onload = () => {
            console.log(`Successfully loaded ${scope}`);
            resolve();
          };
          
          script.onerror = (error) => {
            console.error(`Failed to load script: ${url}`, error);
            reject(new Error(`Failed to load remote entry: ${url}`));
          };
          
          document.head.appendChild(script);
        });
      }
      
      // Check if the container was properly loaded
      // @ts-ignore - federation types are not available
      if (!window[scope]) {
        throw new Error(`Remote container ${scope} was not loaded properly from ${url}`);
      }
      
      // Initialize the container
      // @ts-ignore - federation types are not available
      await window[scope].init(__webpack_share_scopes__.default);
      
      // Get the module factory
      // @ts-ignore - federation types are not available  
      const factory = await window[scope].get(module);
      if (!factory) {
        throw new Error(`Module ${module} not found in remote container ${scope}`);
      }
      
      const Module = factory();
      
      this.setState({
        loading: false,
        Component: Module.default || Module,
        error: null
      });
    } catch (error) {
      console.error('Error loading remote component:', error);
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load component',
        retryCount: this.state.retryCount + 1
      });
    }
  }

  handleRetry = () => {
    this.setState({ loading: true, error: null }, this.loadComponent);
  }

  render() {
    const { fallback, props = {} } = this.props;
    const { loading, error, Component, retryCount } = this.state;
    
    if (loading) {
      return fallback || (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Box sx={{ p: 3, textAlign: 'center', border: '1px solid #f5f5f5', borderRadius: 2 }}>
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
              <li>The remoteEntry.js file is not being served at the expected URL</li>
              <li>There's a network issue preventing the connection</li>
              <li>Module Federation configuration is incompatible</li>
            </ul>
          </Box>
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
        </Box>
      );
    }
    
    if (!Component) {
      return null;
    }
    
    return <Component {...props} />;
  }
}

export default RemoteComponent;