import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Button, IconButton, Drawer, 
  List, ListItem, ListItemIcon, ListItemText, Box, Divider,
  useTheme, useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon, 
  Dashboard as DashboardIcon, 
  Description as DescriptionIcon, 
  Work as WorkIcon, 
  Schedule as ScheduleIcon, 
  Settings as SettingsIcon, 
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const Navigation: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  const [drawerOpen, setDrawerOpen] = useState<boolean>(!isMobile);
  
  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Prompts', icon: <DescriptionIcon />, path: '/prompts' },
    { text: 'Work Orders', icon: <WorkIcon />, path: '/workorders' },
    { text: 'Jobs', icon: <ScheduleIcon />, path: '/jobs' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];
  
  const drawer = (
    <>
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="space-between"
        p={2}
      >
        <Typography variant="h6" noWrap>
          C4H Editor
        </Typography>
        {isMobile && (
          <IconButton onClick={() => setDrawerOpen(false)}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text}
            onClick={() => handleNavigate(item.path)}
            selected={isActive(item.path)}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.18)',
                },
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </>
  );
  
  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          marginLeft: !isMobile ? drawerWidth : 0,
          width: !isMobile ? `calc(100% - ${drawerWidth}px)` : '100%',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => isActive(item.path))?.text || 'C4H Editor'}
          </Typography>
          <Button color="inherit">Login</Button>
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawer}
      </Drawer>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          mt: '64px'
        }}
      >
        {/* Main content will be rendered here by the Router */}
      </Box>
    </>
  );
};

export default Navigation;