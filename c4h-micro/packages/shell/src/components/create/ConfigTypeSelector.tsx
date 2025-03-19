// File: packages/shell/src/components/create/ConfigTypeSelector.tsx
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