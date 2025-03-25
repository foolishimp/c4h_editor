// File: packages/config-selector/src/components/ConfigEditor.tsx
import React, { useEffect, useState, lazy, Suspense } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  Paper
} from '@mui/material';
import { useConfigContext } from '../contexts/ConfigContext';
import { configTypes } from 'shared';

// Lazy load YamlEditor component
const YamlEditor = lazy(() => import('yamlEditor/YamlEditor'));

interface ConfigEditorProps {
  configId: string;
  onBack?: () => void;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ configId, onBack }) => {
  const { 
    configType,
    currentConfig, 
    yaml, 
    loading, 
    error, 
    saved,
    loadConfig,
    createNewConfig,
    updateYaml,
    saveConfig
  } = useConfigContext();
  
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [configIdInput, setConfigIdInput] = useState('');
  const [yamlEditorError, setYamlEditorError] = useState<string | null>(null);
  const [editorInitialized, setEditorInitialized] = useState(false);
  
  // Config name from registry
  const configName = configTypes[configType]?.name || configType;
  
  // Custom navigation handler that doesn't rely on React Router
  const handleNavigate = (path: string) => {
    window.location.href = path;
  };
  
  // Load config or create new one
  useEffect(() => {
    console.log("ConfigEditor: Processing configId:", configId);
    
    // Prevent duplicate initialization
    if (!editorInitialized) {
      if (configId === 'new') {
        console.log("ConfigEditor: Creating new config");
        createNewConfig();
        setConfigIdInput('');
        setEditorInitialized(true);
      } else {
        console.log("ConfigEditor: Loading existing config:", configId);
        loadConfig(configId);
        setEditorInitialized(true);
      }
    }
  }, [configId, loadConfig, createNewConfig, editorInitialized]);
  
  // Update configIdInput when currentConfig changes
  useEffect(() => {
    if (currentConfig) {
      setConfigIdInput(currentConfig.id || '');
    }
  }, [currentConfig]);
  
  // Track changes
  useEffect(() => {
    setHasChanges(configId === 'new' || 
      (currentConfig && (configIdInput !== currentConfig.id))
    );
  }, [configId, currentConfig, configIdInput, yaml]);
  
  // Handle back button click
  const handleBack = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      if (onBack) {
        onBack();
      } else {
        handleNavigate(`/configs/${configType}`);
      }
    }
  };
  
  // Handle discard dialog confirm
  const handleDiscardConfirm = () => {
    setShowDiscardDialog(false);
    setEditorInitialized(false); // Reset for next load
    if (onBack) {
      onBack();
    } else {
      handleNavigate(`/configs/${configType}`);
    }
  };
  
  // Handle discard dialog cancel
  const handleDiscardCancel = () => {
    setShowDiscardDialog(false);
  };
  
  // Handle save
  const handleSave = async () => {
    if (configId === 'new') {
      if (!configIdInput.trim()) {
        // Show validation error
        return;
      }
      console.log(`Saving new config with ID: ${configIdInput}`);
    }
    
    // Save with the configIdInput for new configs
    const savedConfig = await saveConfig(configId === 'new' ? configIdInput : undefined);
    
    if (savedConfig) {
      // Navigate to the config page if this was a new config
      if (configId === 'new') {
        setEditorInitialized(false); // Reset for next load
        handleNavigate(`/configs/${configType}/${savedConfig.id}`);
      }
    }
  };
  
  // Handle YAML change
  const handleYamlChange = (newYaml: string) => {
    updateYaml(newYaml);
    setHasChanges(true);
  };
  
  // Error boundary for YamlEditor
  const handleYamlEditorError = (error: Error) => {
    console.error('YamlEditor error:', error);
    setYamlEditorError(error.message);
  };
  
  if (loading && !currentConfig) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          {configId === 'new' ? `Create New ${configName}` : `Edit ${configName}: ${currentConfig?.id}`}
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={loading || (configId === 'new' && !configIdInput.trim())}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </Box>
      </Box>
      
      {/* ID field for new configs */}
      {configId === 'new' && (
        <TextField
          label={`${configName} ID`}
          fullWidth
          value={configIdInput}
          onChange={(e) => setConfigIdInput(e.target.value)}
          margin="normal"
          variant="outlined"
          required
          error={!configIdInput.trim()}
          helperText={!configIdInput.trim() ? `${configName} ID is required` : `Unique identifier for this ${configName.toLowerCase()}`}
          sx={{ mb: 3 }}
        />
      )}
      
      {/* YAML Editor */}
      {yamlEditorError ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" color="error">YAML Editor failed to load</Typography>
          <Typography variant="body1">{yamlEditorError}</Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Fallback: You can edit the YAML directly in this text field:
          </Typography>
          <TextField
            multiline
            fullWidth
            minRows={10}
            maxRows={20}
            value={yaml}
            onChange={(e) => handleYamlChange(e.target.value)}
            sx={{ mt: 2 }}
          />
        </Paper>
      ) : (
        <Suspense fallback={
          <Paper sx={{ p: 3, height: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress />
          </Paper>
        }>
          <ErrorBoundary onError={handleYamlEditorError}>
            <YamlEditor
              yaml={yaml}
              onChange={handleYamlChange}
              onSave={handleSave}
              title={`${configName} Configuration`}
              description={`Edit the ${configName.toLowerCase()} configuration in YAML format. Changes will only be applied when you save.`}
            />
          </ErrorBoundary>
        </Suspense>
      )}
      
      {/* Error message */}
      {error && (
        <Snackbar open={!!error} autoHideDuration={6000}>
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      )}
      
      {/* Success message */}
      <Snackbar open={saved} autoHideDuration={3000}>
        <Alert severity="success">
          {configName} saved successfully!
        </Alert>
      </Snackbar>
      
      {/* Discard dialog */}
      <Dialog open={showDiscardDialog} onClose={handleDiscardCancel}>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Are you sure you want to discard them?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDiscardCancel}>Cancel</Button>
          <Button onClick={handleDiscardConfirm} color="error">Discard</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Simple error boundary component
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onError: (error: Error) => void;
}, {
  hasError: boolean;
}> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default ConfigEditor;