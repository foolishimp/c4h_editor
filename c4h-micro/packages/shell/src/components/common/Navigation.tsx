// File: packages/shell/src/components/common/Navigation.tsx
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
