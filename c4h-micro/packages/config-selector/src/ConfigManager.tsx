// File: packages/config-selector/src/ConfigManager.tsx
import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { ConfigProvider } from './contexts/ConfigContext';
import ConfigList from './components/ConfigList';
import ConfigEditor from './components/ConfigEditor';
import { configTypes } from 'shared';

interface ConfigManagerProps {
  configType?: string;
  configId?: string;
}

function ConfigManager(props: ConfigManagerProps) {
  const { configType: propConfigType, configId: propConfigId } = props;
  const params = useParams<{ configType?: string, id?: string }>();
  
  // Use the config type from props or URL params
  const configType = propConfigType || params?.configType;
  // Use the config ID from props or URL params
  const configId = propConfigId || params?.id;
  
  // State to track UI view
  const [view, setView] = useState<'list' | 'editor'>(configId ? 'editor' : 'list');
  const [currentConfigId, setCurrentConfigId] = useState<string | undefined>(configId);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Log received props for debugging
    console.log('ConfigManager mounted with:', { 
      propConfigType, 
      propConfigId,
      params,
      configType,
      configId,
      view
    });
    
    // Reset view when configType changes
    if (configId) {
      setView('editor');
      setCurrentConfigId(configId);
    } else {
      setView('list');
      setCurrentConfigId(undefined);
    }
    
    setLoading(false);
  }, [propConfigType, propConfigId, params, configType, configId]);
  
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
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
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