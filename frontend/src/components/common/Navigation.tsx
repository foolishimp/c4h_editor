/**
 * File: frontend/src/components/common/Navigation.tsx
 * Navigation sidebar component with links to different application sections
 */

import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Work as WorkIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';

/**
 * Navigation component that displays the app bar and navigation drawer
 */
const Navigation: React.FC = () => {
  const location = useLocation();
  const drawerWidth = 240;

  // Check if the current path matches the given path
  const isActive = (path: string): boolean => {
    return location.pathname.startsWith(path);
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
          <Typography variant="h6" noWrap component="div">
            C4H WorkOrder Editor
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
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem
              button
              component={RouterLink}
              to="/workorders"
              selected={isActive('/workorders')}
            >
              <ListItemIcon>
                <DescriptionIcon />
              </ListItemIcon>
              <ListItemText primary="WorkOrders" />
            </ListItem>

            <ListItem
              button
              component={RouterLink}
              to="/jobs"
              selected={isActive('/jobs')}
            >
              <ListItemIcon>
                <WorkIcon />
              </ListItemIcon>
              <ListItemText primary="Jobs" />
            </ListItem>
          </List>
          
          <Divider />
          
          <List>
            <ListItem
              button
              component={RouterLink}
              to="/dashboard"
              selected={isActive('/dashboard')}
            >
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navigation;