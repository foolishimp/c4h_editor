// File: /packages/shell/src/components/common/Navigation.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  AppBar,
  Toolbar,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  Description as DescriptionIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Work as WorkIcon,
  Add as AddIcon 
} from '@mui/icons-material';
import { configTypes } from 'shared';

interface NavigationProps {
  drawerWidth: number;
}

const Navigation: React.FC<NavigationProps> = ({ drawerWidth }) => {
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Typography variant="h5" noWrap component="div">
              Visual Prompt Studio
            </Typography>
            <Typography variant="subtitle1" noWrap component="div">
              C4H Editor
            </Typography>
          </Box>
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
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navigation;