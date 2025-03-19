// File: packages/config-selector/src/utils/RemoteComponent.tsx
import React from 'react';
import { CircularProgress, Typography, Box } from '@mui/material';

interface RemoteComponentProps {
  url: string;
  scope: string;
  module: string;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
}

class RemoteComponent extends React.Component<RemoteComponentProps, { loading: boolean, error: string | null, Component: React.ComponentType<any> | null }> {
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

  async loadComponent() {
    const { url, scope, module } = this.props;
    
    try {
      // @ts-ignore - federation types are not available
      const container = window[scope];
      if (!container) {
        // Load the remote container
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.type = 'text/javascript';
          script.async = true;

          script.onload = () => {
            resolve();
          };

          script.onerror = () => {
            reject(new Error(`Failed to load remote module: ${url}`));
          };

          document.head.appendChild(script);
        });
      }
      
      // Initialize the container
      // @ts-ignore - federation types are not available
      await window[scope].init(__webpack_share_scopes__.default);
      
      // Get the module factory
      // @ts-ignore - federation types are not available
      const factory = await window[scope].get(module);
      const Module = factory();
      
      this.setState({
        loading: false,
        Component: Module.default
      });
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load component'
      });
      console.error('Error loading remote component:', error);
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
