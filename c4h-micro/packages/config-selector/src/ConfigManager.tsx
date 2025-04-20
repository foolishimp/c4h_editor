// File: /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/config-selector/src/ConfigManager.tsx
// Removed unused CssBaseline, Container imports
import { Box, Typography } from '@mui/material';
// Removed unused useParams, useNavigate imports
import { ConfigProvider } from './contexts/ConfigContext';
import ConfigList from './components/ConfigList';
import ConfigEditor from './components/ConfigEditor';
import { configTypes } from 'shared';

export interface ConfigManagerProps {
  configType: string; // Now required
  configId?: string;
  onNavigateBack?: () => void; // Callback prop
  onNavigateTo?: (configId: string) => void; // Callback prop
  domElement?: HTMLElement; // Standard single-spa prop
}

/**
 * A microfrontend component for managing various configuration types
 */
function ConfigManager(props: ConfigManagerProps) {
  // Read configType/Id ONLY from props now
  const {
    configType: propConfigType,
    configId: propConfigId,
    onNavigateBack,
    onNavigateTo
  } = props;

  // Navigation handlers that use callbacks
  const handleEditConfig = (id: string) => {
    console.log(`ConfigManager: Requesting navigation to edit ${id}`);
    if (onNavigateTo) {
      onNavigateTo(id); // Signal to parent/shell
    }
  };

  const handleCreateNew = () => {
    console.log('ConfigManager: Requesting navigation to create new');
    if (onNavigateTo) {
      onNavigateTo('new'); // Signal to parent/shell
    }
  };

  const handleBackToList = () => {
    console.log('ConfigManager: Requesting navigation back to list');
    if (onNavigateBack) {
      onNavigateBack(); // Signal to parent/shell
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

        {propConfigId ? (
          <ConfigEditor
            configId={propConfigId} // Pass prop directly
            onBack={handleBackToList} // Pass internal back handler
          />
        ) : (
          <ConfigList
            onEdit={handleEditConfig} // Pass internal edit handler
            onCreateNew={handleCreateNew} // Pass internal create handler
          />
        )}
      </Box>
    </ConfigProvider>
  );
}

export default ConfigManager;