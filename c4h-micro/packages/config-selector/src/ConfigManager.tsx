// File: /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/config-selector/src/ConfigManager.tsx
import { useState, useEffect } from 'react';
// Removed unused CssBaseline, Container imports
import { Box, Typography } from '@mui/material';
// Removed unused useParams, useNavigate imports
import { ConfigProvider } from './contexts/ConfigContext';
import ConfigList from './components/ConfigList';
import ConfigEditor from './components/ConfigEditor';
import { configTypes } from 'shared';

interface ConfigManagerProps {
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

  // Use prop values directly
  const configType = propConfigType;
  const configId = propConfigId;

  // State to track UI view
  const [view, setView] = useState<'list' | 'editor'>(configId ? 'editor' : 'list');
  const [currentConfigId, setCurrentConfigId] = useState<string | undefined>(configId);
  // Removed unused 'loading' state and 'setLoading' setter

  useEffect(() => {
    // Reset view when configId prop changes
    if (configId) {
      setView('editor');
      setCurrentConfigId(configId);
    } else {
      // If propConfigId becomes undefined (e.g., shell navigates back), switch to list
      setView('list');
      setCurrentConfigId(undefined); // Clear current ID when showing list
    }
    // Removed setLoading(false)
  }, [configId]); // Depend only on configId prop

  // Navigation handlers that use callbacks
  const handleEditConfig = (id: string) => {
    console.log(`ConfigManager: Requesting navigation to edit ${id}`);
    if (onNavigateTo) {
      onNavigateTo(id); // Signal to parent/shell
    } else {
      // Fallback to internal state change if no callback provided (less ideal)
      console.warn("ConfigManager: onNavigateTo prop not provided, handling internally.");
      setView('editor');
      setCurrentConfigId(id);
    }
  };

  const handleCreateNew = () => {
    console.log('ConfigManager: Requesting navigation to create new');
    if (onNavigateTo) {
      onNavigateTo('new'); // Signal to parent/shell
    } else {
      // Fallback
      console.warn("ConfigManager: onNavigateTo prop not provided, handling internally.");
      setView('editor');
      setCurrentConfigId('new');
    }
  };

  const handleBackToList = () => {
    console.log('ConfigManager: Requesting navigation back to list');
    if (onNavigateBack) {
      onNavigateBack(); // Signal to parent/shell
    } else {
      // Fallback
      console.warn("ConfigManager: onNavigateBack prop not provided, handling internally.");
      setView('list');
      setCurrentConfigId(undefined);
    }
  };

  // Removed loading state check as it's handled by context now?
  // if (loading) { ... }

  if (!configType) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          Configuration type not provided via props.
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

  // Main component render
  return (
    <ConfigProvider configType={configType}>
      <Box sx={{ p: 3, height: '100%' }}>
        <Typography variant="h4" gutterBottom data-testid="config-heading">
          {configTypes[configType].name} Management
        </Typography>

        {view === 'editor' ? (
          <ConfigEditor
            configId={currentConfigId || 'new'} // Pass current internal ID state
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