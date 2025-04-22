/**
 * /packages/config-selector/src/components/ConfigEditor.tsx
 * Configuration editor that directly embeds YamlEditor
 */
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Snackbar, Alert, TextField, Button, 
  CircularProgress, Paper 
} from '@mui/material';
import { useConfigContext } from '../contexts/ConfigContext';
import { configTypes } from 'shared';

// Direct import from yaml-editor
import YamlEditor from 'yaml-editor';

interface ConfigEditorProps {
  configId: string;
  onBack: () => void;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ configId, onBack }) => {
  const {
    configType,
    currentConfig,
    yaml,
    updateYaml,
    saveConfig,
    loading,
    error: contextError,
    saved,
    loadConfig
  } = useConfigContext();

  // Local state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [newIdInput, setNewIdInput] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState("");

  // Determine if we are creating a new config
  const isNew = configId === 'new';

  // Load config when component mounts or configId changes
  useEffect(() => {
    console.log(`ConfigEditor: Loading config ${configId}`);
    loadConfig(configId);
  }, [configId, loadConfig]);

  // Update local state if currentConfig changes
  useEffect(() => {
    if (currentConfig && !isNew) {
      setNewIdInput(currentConfig.id || "");
    } else if (isNew) {
      setNewIdInput("");
    }
  }, [currentConfig, isNew]);

  // Handle save
  const handleSave = async () => {
    const idToSave = isNew ? newIdInput : configId;
    if (!idToSave || !idToSave.trim()) {
      setSnackbarMessage("Configuration ID cannot be empty.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    console.log(`ConfigEditor: Saving ${configType} config ${idToSave}`);
    const result = await saveConfig(idToSave, commitMessage);
    
    if (result) {
      setSnackbarMessage("Configuration saved successfully!");
      setSnackbarSeverity("success");
      setCommitMessage("");
      
      if (isNew) {
        setTimeout(() => onBack && onBack(), 1000);
      }
    } else {
      setSnackbarMessage(contextError || "Failed to save configuration.");
      setSnackbarSeverity("error");
    }
    setSnackbarOpen(true);
  };

  // Show loading indicator
  if (loading && !currentConfig) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading configuration...</Typography>
      </Box>
    );
  }

  // Show error if loading failed
  if (contextError && !currentConfig) {
    return <Alert severity="error" sx={{ m: 3 }}>Error loading configuration: {contextError}</Alert>;
}

 // Main editor view with YamlEditor directly embedded
 return (
   <Box sx={{ p: 0 }}>
      <Button variant="outlined" onClick={onBack} disabled={loading} sx={{ mb: 2 }}>
        Back to List
      </Button>

     <Typography variant="h5" gutterBottom>
       {isNew ? `Create New ${configTypes[configType]?.name || configType}` : `Edit ${configTypes[configType]?.name || configType}: ${currentConfig?.id || configId}`}
     </Typography>

     { /* YamlEditor component */ }
     {yaml !== undefined ? (
       <>
          {/* Conditionally render ID input field only for new configs */}
          {isNew && (
            <TextField
              label="Configuration ID"
              value={newIdInput}
              onChange={(e) => setNewIdInput(e.target.value.trim())}
              fullWidth
              required
              error={!newIdInput} // Show error if empty
              helperText={!newIdInput ? "Configuration ID is required." : "Enter a unique ID for the new configuration."}
              margin="normal"
              sx={{ mb: 2 }}
              disabled={loading}
            />
          )}
         <YamlEditor
           yaml={yaml}
           onChange={updateYaml}
           onSave={handleSave}
           readOnly={loading}
           title={`${configTypes[configType]?.name || configType} Configuration`}
           description="Edit the configuration in YAML format. Changes will be applied when you save."
         />
       </>
     ) : (
       <Paper sx={{ p: 3, textAlign: 'center', mb: 2 }}>
         <CircularProgress size={24} sx={{ mb: 2 }} />
         <Typography>Loading YAML content...</Typography>
       </Paper>
     )}

     {/* Commit Message Input */}
     <TextField
       label="Commit Message (Optional)"
       value={commitMessage}
       onChange={(e) => setCommitMessage(e.target.value)}
       fullWidth
       margin="normal"
       sx={{ mb: 2 }}
       disabled={loading}
       helperText="Describe the changes you made."
     />

     { /* Action Buttons */ }
     <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        {/* Back button moved to top */}
        <span></span> {/* Placeholder for spacing */}
       <Button
         variant="contained" 
         onClick={handleSave}
         disabled={loading || saved || yaml === undefined || (isNew && !newIdInput)} // Disable save if new and no ID
       >
         {loading ? <CircularProgress size={24} /> : 'Save Configuration'}
       </Button>
     </Box>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbarSeverity} sx={{ width: '100%' }} onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConfigEditor;