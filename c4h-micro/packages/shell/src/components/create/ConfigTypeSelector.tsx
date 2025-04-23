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
} from '@mui/material'; // Keep Button import
import { configTypes, AppDefinition } from 'shared'; // Keep configTypes for metadata lookup, import AppDefinition
import { 
  Description as DescriptionIcon,
  Group as GroupIcon,
  Settings as SettingsIcon 
} from '@mui/icons-material';
// Import the context hook
import { useShellConfig } from '../../contexts/ShellConfigContext';

const ConfigTypeSelector: React.FC = () => {
  const navigate = useNavigate();
  // Get availableApps from the shell context
  const { availableApps, loading: shellLoading, error: shellError } = useShellConfig();
  
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
  
  // Handle config type selection (parameter is now the configType key)
  const handleSelectConfigType = (configType: string) => {
    navigate(`/configs/${configType}/new`);
  };
  
  // Filter availableApps to find only the config selector types
  const availableConfigSelectors = React.useMemo(() => {
    if (!availableApps) return [];
    // Filter apps where the app.id is a key in our configTypes metadata registry
    return availableApps.filter(app => configTypes.hasOwnProperty(app.id));
  }, [availableApps]);

  if (shellLoading) {
    return <Typography sx={{p: 3}}>Loading available application types...</Typography>;
  }

  if (shellError) {
    return <Typography sx={{p: 3}} color="error">Error loading application types: {shellError}</Typography>;
  }
  
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
        {/* Iterate over the filtered availableApps */}
        {availableConfigSelectors.map((app) => {
          // Use app.id (which is now 'workorder', 'teamconfig', etc.) to look up metadata
          const configMetadata = configTypes[app.id];
          if (!configMetadata) return null; // Should not happen if filter works

          return (<Grid item xs={12} sm={6} md={4} key={app.id}>
            <Card>
              <CardActionArea onClick={() => handleSelectConfigType(app.id)}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  {getConfigTypeIcon(app.id)} {/* Use app.id for icon lookup */}
                  <Typography variant="h5" component="div" sx={{ mt: 2 }}>
                    {configMetadata.name} {/* Get name from configTypes metadata */}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {configMetadata.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>)
        })}
      </Grid>
    </Box>
  );
};

export default ConfigTypeSelector;