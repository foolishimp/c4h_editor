// File: /packages/config-selector/src/ConfigManager.tsx
import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
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
  
  // Use navigate if available (inside Router context)
  let navigate: ReturnType<typeof useNavigate>;
  try {
    navigate = useNavigate();
  } catch (e) {
    // Navigation is handled through direct props in non-Router context
  }
  
  // Use the config type from props or URL params
  const configType = propConfigType || params?.configType;
  // Use the config ID from props or URL params
  const configId = propConfigId || params?.id;
  
  // State to track UI view
  const [view, setView] = useState<'list' | 'editor'>(configId ? 'editor' : 'list');
  const [currentConfigId, setCurrentConfigId] = useState<string | undefined>(configId);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Debug log
  console.log('ConfigManager mounted with:', { 
    propConfigType, 
    propConfigId,
    params,
    configType,
    configId,
    view,
    currentConfigId
  });
  
  useEffect(() => {
    // Reset view when configId changes
    if (configId) {
      setView('editor');
      setCurrentConfigId(configId);
    } else {
      // Only reset to list if we're not already in editor view with a currentConfigId
      // This prevents losing editor state when props/params don't have configId yet
      if (view === 'editor' && !currentConfigId) {
        setView('list');
      }
    }
    
    setLoading(false);
  }, [configId]);
  
  // Handle navigation
  const handleEditConfig = (configId: string) => {
    if (navigate) {
      navigate(`/configs/${configType}/${configId}`);
    } else {
      setView('editor');
      setCurrentConfigId(configId);
    }
  };
  
  const handleCreateNew = () => {
    console.log('Creating new config of type:', configType);
    if (navigate) {
      navigate(`/configs/${configType}/new`);
    } else {
      // Directly set the view and ID even without navigation
      setView('editor');
      setCurrentConfigId('new');
    }
  };
  
  const handleBackToList = () => {
    if (navigate) {
      navigate(`/configs/${configType}`);
    } else {
      setView('list');
      setCurrentConfigId(undefined);
    }
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
        
        {view === 'editor' ? (
          <ConfigEditor 
            configId={currentConfigId || 'new'} 
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