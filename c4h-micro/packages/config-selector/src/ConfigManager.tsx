// File: packages/config-selector/src/ConfigManager.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { ConfigProvider } from './contexts/ConfigContext';
import ConfigList from './components/ConfigList';
import ConfigEditor from './components/ConfigEditor';
import { configTypes } from 'shared';

interface ConfigManagerProps {
  configType?: string;
}

const ConfigManager: React.FC<ConfigManagerProps> = ({ configType: propConfigType }) => {
  const { configType: paramConfigType, id } = useParams<{ configType?: string, id?: string }>();
  
  // Use the config type from props or URL params
  const configType = propConfigType || paramConfigType;
  
  if (!configType) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          No configuration type specified
        </Typography>
        <Typography variant="body1">
          Please specify a configuration type to manage.
        </Typography>
      </Box>
    );
  }
  
  // Check if the config type is valid
  if (!configTypes[configType]) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          Invalid configuration type: {configType}
        </Typography>
        <Typography variant="body1">
          The specified configuration type is not supported.
        </Typography>
      </Box>
    );
  }
  
  return (
    <ConfigProvider configType={configType}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {configTypes[configType].name} Management
        </Typography>
        
        {id ? (
          <ConfigEditor configId={id} />
        ) : (
          <ConfigList />
        )}
      </Box>
    </ConfigProvider>
  );
};

export default ConfigManager;