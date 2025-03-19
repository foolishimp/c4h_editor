// File: packages/shell/src/components/common/ConfigTypeSidebar.tsx
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
