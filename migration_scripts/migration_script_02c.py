#!/usr/bin/env python3
# migration_script_2c.py
#
# This script creates remaining components for the ConfigSelector microfrontend:
# 1. ConfigEditor component
# 2. RemoteComponent utility
# 3. Updates package.json and global.d.ts to include ConfigSelector

import os
import json
from pathlib import Path

BASE_DIR = Path("c4h-micro")

def create_directory(path):
    if not path.exists():
        print(f"Creating directory: {path}")
        path.mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)

def create_config_selector_remaining_components():
    config_selector_dir = BASE_DIR / "packages" / "config-selector"
    
    # Create ConfigEditor component
    config_editor = """// File: packages/config-selector/src/components/ConfigEditor.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { lazy, Suspense } from 'react';

// Lazy load the YamlEditor from the remote microfrontend
const YamlEditor = lazy(() => import('yamlEditor/YamlEditor'));

// Loading placeholder for the YamlEditor
const YamlEditorLoading = () => (
  <Paper sx={{ p: 3, height: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <CircularProgress />
  </Paper>
);

// Error fallback if YamlEditor fails to load
const YamlEditorError = () => (
  <Paper sx={{ p: 3, height: '500px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
    <Typography variant="h6" color="error" gutterBottom>Failed to load YAML Editor</Typography>
    <Typography>Please ensure the YAML Editor microfrontend is running on port 3002.</Typography>
    <Button variant="contained" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
      Retry
    </Button>
  </Paper>
);

interface ConfigEditorProps {
  configId: string;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ configId }) => {
  const navigate = useNavigate();
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
  
  // Config name from registry
  const configName = configTypes[configType]?.name || configType;
  
  // Load config or create new one
  useEffect(() => {
    if (configId === 'new') {
      createNewConfig();
      setConfigIdInput('');
    } else {
      loadConfig(configId);
    }
  }, [configId, loadConfig, createNewConfig]);
  
  // Update configIdInput when currentConfig changes
  useEffect(() => {
    if (currentConfig) {
      setConfigIdInput(currentConfig.id);
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
      navigate(`/${configType}`);
    }
  };
  
  // Handle discard dialog confirm
  const handleDiscardConfirm = () => {
    setShowDiscardDialog(false);
    navigate(`/${configType}`);
  };
  
  // Handle discard dialog cancel
  const handleDiscardCancel = () => {
    setShowDiscardDialog(false);
  };
  
  // Handle save
  const handleSave = async () => {
    if (configId === 'new' && !configIdInput.trim()) {
      // Update the current config with the entered ID
      if (currentConfig) {
        currentConfig.id = configIdInput;
      }
    }
    
    const savedConfig = await saveConfig();
    
    if (savedConfig) {
      // Navigate to the config page if this was a new config
      if (configId === 'new') {
        navigate(`/${configType}/${savedConfig.id}`);
      }
    }
  };
  
  // Handle YAML change
  const handleYamlChange = (newYaml: string) => {
    updateYaml(newYaml);
    setHasChanges(true);
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
      <Suspense fallback={<YamlEditorLoading />}>
        <ErrorBoundary fallback={<YamlEditorError />}>
          <YamlEditor
            yaml={yaml}
            onChange={handleYamlChange}
            onSave={handleSave}
            title={`${configName} Configuration`}
            description={`Edit the ${configName.toLowerCase()} configuration in YAML format. Changes will only be applied when you save.`}
          />
        </ErrorBoundary>
      </Suspense>
      
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
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default ConfigEditor;
"""
    
    write_file(config_selector_dir / "src" / "components" / "ConfigEditor.tsx", config_editor)
    
    # Create RemoteComponent utility
    remote_component = """// File: packages/config-selector/src/utils/RemoteComponent.tsx
import React from 'react';
import { CircularProgress, Typography, Box } from '@mui/material';

interface RemoteComponentProps {
  url: string;
  scope: string;
  module: string;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
}

class RemoteComponent extends React.Component<RemoteComponentProps, { loading: boolean, error: string | null, Component: React.ComponentType<any> | null }> {
  constructor(props: RemoteComponentProps) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      Component: null
    };
  }

  componentDidMount() {
    this.loadComponent();
  }

  async loadComponent() {
    const { url, scope, module } = this.props;
    
    try {
      // @ts-ignore - federation types are not available
      const container = window[scope];
      if (!container) {
        // Load the remote container
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.type = 'text/javascript';
          script.async = true;

          script.onload = () => {
            resolve();
          };

          script.onerror = () => {
            reject(new Error(`Failed to load remote module: ${url}`));
          };

          document.head.appendChild(script);
        });
      }
      
      // Initialize the container
      // @ts-ignore - federation types are not available
      await window[scope].init(__webpack_share_scopes__.default);
      
      // Get the module factory
      // @ts-ignore - federation types are not available
      const factory = await window[scope].get(module);
      const Module = factory();
      
      this.setState({
        loading: false,
        Component: Module.default
      });
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load component'
      });
      console.error('Error loading remote component:', error);
    }
  }

  render() {
    const { fallback, props = {} } = this.props;
    const { loading, error, Component } = this.state;
    
    if (loading) {
      return fallback || (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Failed to load component
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Box>
      );
    }
    
    if (!Component) {
      return null;
    }
    
    return <Component {...props} />;
  }
}

export default RemoteComponent;
"""
    
    write_file(config_selector_dir / "src" / "utils" / "RemoteComponent.tsx", remote_component)
    
    # Update the root package.json to include config-selector
    root_package_json_path = BASE_DIR / "package.json"
    with open(root_package_json_path, "r") as file:
        root_package_json = json.load(file)
    
    # Add scripts for config-selector
    if "scripts" in root_package_json:
        root_package_json["scripts"]["start:config-selector"] = "npm run start -w packages/config-selector"
        root_package_json["scripts"]["build:config-selector"] = "npm run build -w packages/config-selector"
        
        # Update start script to include config-selector
        start_script = root_package_json["scripts"]["start"]
        if "config-selector" not in start_script:
            root_package_json["scripts"]["start"] = 'concurrently -n "yaml-editor,config-selector,config-editor,shell" -c "yellow,cyan,blue,green" "npm run start:yaml-editor" "npm run start:config-selector" "npm run start:config-editor" "wait-on http://localhost:3001 http://localhost:3002 http://localhost:3003 && npm run start:shell"'
        
        # Update build script
        build_script = root_package_json["scripts"]["build"]
        if "config-selector" not in build_script:
            root_package_json["scripts"]["build"] = "npm run build:shared && npm run build:yaml-editor && npm run build:config-selector && npm run build:config-editor && npm run build:shell"
    
    write_file(root_package_json_path, json.dumps(root_package_json, indent=2))
    
    # Update global.d.ts to include ConfigSelector
    global_d_ts_path = BASE_DIR / "global.d.ts"
    with open(global_d_ts_path, "r") as file:
        global_d_ts_content = file.read()
    
    if "configSelector/ConfigManager" not in global_d_ts_content:
        updated_global_d_ts = global_d_ts_content.strip() + "\ndeclare module 'configSelector/ConfigManager';\n"
        write_file(global_d_ts_path, updated_global_d_ts)
    
    print("ConfigEditor and RemoteComponent created! ConfigSelector microfrontend setup completed!")

if __name__ == "__main__":
    create_config_selector_remaining_components()