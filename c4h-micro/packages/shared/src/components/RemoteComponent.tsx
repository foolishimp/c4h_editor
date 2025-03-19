// File: packages/shared/src/components/RemoteComponent.tsx
import React from 'react';
import { CircularProgress, Typography, Box } from '@mui/material';

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
  Component: React.ComponentType<any> | null 
}> {
  constructor(props: RemoteComponentProps) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      Component: null
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
      this.setState({ loading: true, Component: null }, this.loadComponent);
    }
  }

  async loadComponent() {
    const { url, scope, module } = this.props;
    
    try {
      // @ts-ignore - federation types are not available
      const container = window[scope];
      if (!container) {
        // Load the remote container
        await new Promise<void>((resolve, reject) => {
          console.log(`Loading remote module ${scope} from ${url}`);
          const script = document.createElement('script');
          script.src = url;
          script.type = 'text/javascript';
          script.async = true;
          script.crossOrigin = "anonymous";

          script.onload = () => {
            console.log(`Successfully loaded ${scope}`);
            resolve();
          };

          script.onerror = (event) => {
            console.error(`Failed to load script: ${url}`);
            reject(new Error(`Failed to load remote module: ${url}, error: ${event}`));
          };

          document.head.appendChild(script);
        });
      }
      
      // Check if the container was loaded
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
        Component: Module.default || Module
      });
    } catch (error) {
      console.error('Error loading remote component:', error);
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load component'
      });
    }
  }

  render() {
    const { fallback, props = {} } = this.props;
    const { loading, error, Component } = this.state;
    
    if (loading) {
      return fallback || (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Failed to load component
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()} 
            sx={{ mt: 2 }}
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

// Add missing Button import
import { Button } from '@mui/material';

export default RemoteComponent;