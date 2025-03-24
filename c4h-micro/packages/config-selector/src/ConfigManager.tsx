// packages/config-selector/src/ConfigManager.tsx

import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { ConfigProvider } from './contexts/ConfigContext';
import ConfigList from './components/ConfigList';
import ConfigEditor from './components/ConfigEditor';
import { configTypes } from 'shared';

interface ConfigManagerProps {
  configType?: string;
  configId?: string;
}

// Using regular function declaration instead of arrow function
// to ensure React hooks work correctly across module boundaries
function ConfigManager(props: ConfigManagerProps) {
  const { configType: propConfigType, configId: propConfigId } = props;
  const params = useParams<{ configType?: string, id?: string }>();
  const paramConfigType = params?.configType;
  const paramConfigId = params?.id;
  
  // Use the config type from props or URL params
  const configType = propConfigType || paramConfigType;
  // Use the config ID from props or URL params
  const id = propConfigId || paramConfigId;
  
  // State to track UI view
  const [view, setView] = useState<'list' | 'editor'>(id ? 'editor' : 'list');
  const [currentConfigId, setCurrentConfigId] = useState<string | undefined>(id);
  
  console.log('ConfigManager received:', { 
    propConfigType, 
    paramConfigType, 
    configType,
    propConfigId,
    paramConfigId,
    id,
    view,
    currentConfigId
  });
  
  // Handle navigation without React Router
  const handleEditConfig = (configId: string) => {
    setView('editor');
    setCurrentConfigId(configId);
  };
  
  const handleCreateNew = () => {
    setView('editor');
    setCurrentConfigId('new');
  };
  
  const handleBackToList = () => {
    setView('list');
    setCurrentConfigId(undefined);
  };
  
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
        
        {view === 'editor' && currentConfigId ? (
          <ConfigEditor 
            configId={currentConfigId} 
            onBack={handleBackToList} 
          />
        ) : (
          <ConfigList 
            onEdit={handleEditConfig}
            onCreateNew={handleCreateNew}
          />
        )}
      </Box>
    </ConfigProvider>
  );
}

export default ConfigManager;