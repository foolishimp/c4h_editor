/**
 * /packages/config-selector/src/ConfigManager.tsx
 */
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { ConfigProvider } from './contexts/ConfigContext';
import ConfigList from './components/ConfigList';
import ConfigEditor from './components/ConfigEditor';
import { configTypes } from 'shared';

export interface ConfigManagerProps {
  configType: string;
  configId?: string;
  onNavigateBack?: () => void;
  onNavigateTo?: (configId: string) => void;
  domElement?: HTMLElement;
}

function ConfigManager(props: ConfigManagerProps) {
  const {
    configType: propConfigType,
    configId: propConfigId,
    onNavigateBack,
    onNavigateTo
  } = props;

  // Local state to track if viewing a config or list
  const [viewingConfigId, setViewingConfigId] = useState<string | null>(propConfigId || null);

  // Navigation handlers that use callbacks
  const handleEditConfig = (id: string) => {
    console.log(`ConfigManager: Requesting navigation to edit ${id}`);
    setViewingConfigId(id);
    if (onNavigateTo) {
      onNavigateTo(id);
    }
  };

  const handleCreateNew = () => {
    console.log('ConfigManager: Requesting navigation to create new');
    setViewingConfigId('new');
    if (onNavigateTo) {
      onNavigateTo('new');
    }
  };

  const handleBackToList = () => {
    console.log('ConfigManager: Requesting navigation back to list');
    setViewingConfigId(null);
    if (onNavigateBack) {
      onNavigateBack();
    }
  };

  if (!propConfigType) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          Configuration type not provided via props.
        </Typography>
      </Box>
    );
  }

  // Check if the config type is valid
  if (!configTypes[propConfigType]) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          Invalid configuration type: {propConfigType}
        </Typography>
        <Typography variant="body1">
          The specified configuration type is not supported.
        </Typography>
      </Box>
    );
  }

  // Main component render
  return (
    <ConfigProvider configType={propConfigType}>
      <Box sx={{ p: 3, height: '100%' }}>
        <Typography variant="h4" gutterBottom data-testid="config-heading">
          {configTypes[propConfigType].name} Management
        </Typography>

        {viewingConfigId ? (
          <ConfigEditor
            configId={viewingConfigId}
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