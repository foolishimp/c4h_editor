#!/usr/bin/env python3
# migration_script_5.py
#
# This script updates the shell application to:
# 1. Integrate all microfrontends
# 2. Create a dynamic configuration-driven navigation
# 3. Set up routing for the new components

import os
import json
from pathlib import Path

BASE_DIR = Path("c4h-micro")

def create_directory(path):
    if not path.exists():
        print(f"Creating directory: {path}")
        path.mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)

def update_shell_application():
    shell_dir = BASE_DIR / "packages" / "shell"
    shell_src_dir = shell_dir / "src"
    shell_components_dir = shell_src_dir / "components"
    
    # Create utils directory if it doesn't exist
    shell_utils_dir = shell_src_dir / "utils"
    create_directory(shell_utils_dir)
    
    # Update vite.config.ts with all remotes
    vite_config = """// File: packages/shell/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        configEditor: 'http://localhost:3001/assets/remoteEntry.js',
        yamlEditor: 'http://localhost:3002/assets/remoteEntry.js',
        configSelector: 'http://localhost:3003/assets/remoteEntry.js',
        jobManagement: 'http://localhost:3004/assets/remoteEntry.js'
      },
      shared: ['react', 'react-dom']
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    },
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    // Make sure modulePreload is false for Module Federation
    modulePreload: false
  },
  server: {
    port: 3000
  }
});
"""
    
    write_file(shell_dir / "vite.config.ts", vite_config)
    
    # Create RemoteComponent utility
    remote_component = """// File: packages/shell/src/utils/RemoteComponent.tsx
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
"""
    
    write_file(shell_utils_dir / "RemoteComponent.tsx", remote_component)
    
    # Create ConfigTypeSidebar component
    config_type_sidebar = """// File: packages/shell/src/components/common/ConfigTypeSidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Tooltip
} from '@mui/material';
import { 
  Description as DescriptionIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Work as WorkIcon,
  Add as AddIcon 
} from '@mui/icons-material';
import { configTypes } from 'shared';

interface ConfigTypeSidebarProps {
  drawerWidth: number;
}

const ConfigTypeSidebar: React.FC<ConfigTypeSidebarProps> = ({ drawerWidth }) => {
  const location = useLocation();
  
  // Function to determine if a path is active
  const isActive = (path: string): boolean => {
    return location.pathname.startsWith(path);
  };
  
  // Function to get an icon for a config type
  const getConfigTypeIcon = (configType: string) => {
    switch (configType) {
      case 'workorder':
        return <DescriptionIcon />;
      case 'teamconfig':
        return <GroupIcon />;
      case 'runtimeconfig':
        return <SettingsIcon />;
      default:
        return <DescriptionIcon />;
    }
  };
  
  return (
    <Box
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <List>
        {/* Config type navigation */}
        {Object.entries(configTypes).map(([type, config]) => (
          <ListItem key={type} disablePadding>
            <ListItemButton
              component={Link}
              to={`/configs/${type}`}
              selected={isActive(`/configs/${type}`)}
            >
              <ListItemIcon>
                {getConfigTypeIcon(type)}
              </ListItemIcon>
              <ListItemText primary={config.name} />
            </ListItemButton>
          </ListItem>
        ))}
        
        {/* Add new config dropdown */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/configs/create"
            selected={isActive('/configs/create')}
          >
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary="Create New" />
          </ListItemButton>
        </ListItem>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Jobs navigation */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/jobs"
            selected={isActive('/jobs')}
          >
            <ListItemIcon>
              <WorkIcon />
            </ListItemIcon>
            <ListItemText primary="Jobs" />
          </ListItemButton>
        </ListItem>
        
        {/* Legacy navigation items (for backward compatibility) */}
        <Divider sx={{ my: 1 }} />
        <ListItem disablePadding>
          <Tooltip title="Legacy WorkOrders (old UI)" placement="right">
            <ListItemButton
              component={Link}
              to="/workorders"
              selected={isActive('/workorders')}
            >
              <ListItemIcon>
                <DescriptionIcon color="disabled" />
              </ListItemIcon>
              <ListItemText primary="Legacy WorkOrders" sx={{ color: 'text.secondary' }} />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Box>
  );
};

export default ConfigTypeSidebar;
"""
    
    write_file(shell_components_dir / "common" / "ConfigTypeSidebar.tsx", config_type_sidebar)
    
    # Update Navigation component
    navigation = """// File: packages/shell/src/components/common/Navigation.tsx
import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Box,
} from '@mui/material';
import ConfigTypeSidebar from './ConfigTypeSidebar';

interface NavigationProps {
  drawerWidth: number;
}

const Navigation: React.FC<NavigationProps> = ({ drawerWidth }) => {
  return (
    <>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            C4H Editor
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            marginTop: '64px' 
          },
        }}
      >
        <ConfigTypeSidebar drawerWidth={drawerWidth} />
      </Drawer>
    </>
  );
};

export default Navigation;
"""
    
    write_file(shell_components_dir / "common" / "Navigation.tsx", navigation)
    
    # Create ConfigTypeSelector component
    config_type_selector = """// File: packages/shell/src/components/create/ConfigTypeSelector.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Button
} from '@mui/material';
import { configTypes } from 'shared';
import { 
  Description as DescriptionIcon,
  Group as GroupIcon,
  Settings as SettingsIcon 
} from '@mui/icons-material';

const ConfigTypeSelector: React.FC = () => {
  const navigate = useNavigate();
  
  // Function to get an icon for a config type
  const getConfigTypeIcon = (configType: string) => {
    switch (configType) {
      case 'workorder':
        return <DescriptionIcon sx={{ fontSize: 48 }} />;
      case 'teamconfig':
        return <GroupIcon sx={{ fontSize: 48 }} />;
      case 'runtimeconfig':
        return <SettingsIcon sx={{ fontSize: 48 }} />;
      default:
        return <DescriptionIcon sx={{ fontSize: 48 }} />;
    }
  };
  
  // Handle config type selection
  const handleSelectConfigType = (configType: string) => {
    navigate(`/configs/${configType}/new`);
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Create New Configuration</Typography>
        <Button onClick={() => navigate(-1)}>Back</Button>
      </Box>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Select a configuration type to create:
      </Typography>
      
      <Grid container spacing={3}>
        {Object.entries(configTypes).map(([type, config]) => (
          <Grid item xs={12} sm={6} md={4} key={type}>
            <Card>
              <CardActionArea onClick={() => handleSelectConfigType(type)}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  {getConfigTypeIcon(type)}
                  <Typography variant="h5" component="div" sx={{ mt: 2 }}>
                    {config.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {config.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ConfigTypeSelector;
"""
    
    write_file(shell_components_dir / "create" / "ConfigTypeSelector.tsx", config_type_selector)
    
    # Create directory for create components
    create_directory(shell_components_dir / "create")
    
    # Update App.tsx
    app_tsx = """// File: packages/shell/src/App.tsx
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
"""
    
    write_file(shell_src_dir / "App.tsx", app_tsx)
    
    print("Shell application updated to integrate all microfrontends!")

if __name__ == "__main__":
    update_shell_application()