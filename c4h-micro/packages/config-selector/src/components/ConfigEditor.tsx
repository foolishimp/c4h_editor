import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Snackbar, Alert, TextField, Button, CircularProgress } from '@mui/material'; // Added TextField, Button, CircularProgress
import { useConfigContext } from '../contexts/ConfigContext';
import { configTypes } from 'shared'; // Import configTypes to get the display name

// Removed the unused yamlEditorComponent prop for now, assuming direct usage or separate component
interface ConfigEditorProps {
  configId: string; // Now used to check if creating new or editing existing
  onBack: () => void; // Callback to signal navigation back to the list
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ configId, onBack }) => {
  // Get the *correct* values from the context
  const {
    configType,
    currentConfig, // Contains the loaded config data (or null/initial state)
    yaml,          // The current YAML string state
    updateYaml,    // Function to update the YAML string state
    saveConfig,    // Function to save the current state (parses YAML internally)
    loading,       // Loading state from context
    error: contextError, // Context error state
    saved,         // Whether the current state is saved
    loadConfig     // Function to load/reload a config
  } = useConfigContext();

  // Local state for UI feedback and potential inputs
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [commitMessage, setCommitMessage] = useState(""); // For save commit message
  const [newIdInput, setNewIdInput] = useState<string>(""); // For entering ID when creating new

  // Determine if we are creating a new config
  const isNew = configId === 'new';

  // Effect to load the config when the component mounts or configId changes
  // This simplifies logic as the component now triggers the load based on its prop
  useEffect(() => {
    loadConfig(configId); // Context handles loading logic including 'new' case
  }, [configId, loadConfig]);

  // Effect to update local state if currentConfig changes externally
  useEffect(() => {
    if (currentConfig && !isNew) {
      setNewIdInput(currentConfig.id || ""); // Pre-fill ID for existing
    } else if (isNew) {
      setNewIdInput(""); // Clear ID field for new
    }
    // YAML state is already managed by context via updateYaml
  }, [currentConfig, isNew]);


  // Callback to update YAML in context state
  const handleYamlChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateYaml(event.target.value);
  }, [updateYaml]);

  // Callback to handle saving
  const handleSave = useCallback(async () => {
    const idToSave = isNew ? newIdInput : configId; // Use input for new, prop for existing
    if (!idToSave || !idToSave.trim()) {
       setSnackbarMessage("Configuration ID cannot be empty.");
       setSnackbarSeverity("error");
       setSnackbarOpen(true);
       return;
    }

    const result = await saveConfig(idToSave, commitMessage); // Pass ID (if new) and commit message
    if (result) {
      setSnackbarMessage("Configuration saved successfully!");
      setSnackbarSeverity("success");
      setCommitMessage(""); // Clear commit message after save
      
      // If it was new and we have the navigation callback, navigate to the newly created config
      if (isNew && onBack && result) {
        setTimeout(() => onBack(), 1500); // Navigate back after showing success message
      }
       // If it was new, we might want to navigate back or update the URL/state
       // For now, just show success. Parent component (ConfigManager) handles view change via props.
    } else {
      // Error is handled by context, but show snackbar
      setSnackbarMessage(contextError || "Failed to save configuration.");
      setSnackbarSeverity("error");
    }
    setSnackbarOpen(true);
  }, [isNew, newIdInput, configId, saveConfig, commitMessage, contextError]);

  // Get display name from configTypes registry
  const configDisplayName = configTypes[configType]?.name || configType;

  // Show loading indicator from context
  if (loading && !currentConfig) { // Show loading only if no config is displayed yet
      return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading {configDisplayName}...</Typography>
          </Box>
      );
  }

  // Show error from context if loading failed
  if (contextError && !currentConfig) {
     return <Alert severity="error" sx={{ m: 3 }}>Error loading configuration: {contextError}</Alert>;
  }

  // Handle case where config might be null unexpectedly after loading attempt
  // (Should ideally be handled by loadConfig setting an error)
  if (!currentConfig && !isNew) {
     return <Alert severity="warning" sx={{ m: 3 }}>Configuration not found or failed to load.</Alert>;
  }

  return (
    <Box sx={{ p: 0 }}> {/* Remove padding if parent adds it */}
      <Typography variant="h5" gutterBottom>
        {isNew ? `Create New ${configDisplayName}` : `Edit ${configDisplayName}: ${currentConfig?.id || configId}`}
      </Typography>

      {/* ID Input Field (Only for New) */}
      {isNew && (
         <TextField
              label="New Configuration ID"
              value={newIdInput}
              onChange={(e) => setNewIdInput(e.target.value.trim())}
              fullWidth
              required
              margin="normal"
              sx={{ mb: 2 }}
              disabled={loading}
              helperText="Enter a unique ID for the new configuration."
          />
      )}

      {/* YAML Editor Area (assuming a simple textarea for now) */}
      {/* TODO: Integrate the actual YamlEditor component here if build issue is resolved */}
      <TextField
        label={`${configDisplayName} YAML Configuration`}
        multiline
        rows={20}
        value={yaml}
        onChange={handleYamlChange}
        variant="outlined"
        fullWidth
        sx={{ mb: 2, fontFamily: 'monospace', '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
        disabled={loading}
      />

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

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button variant="outlined" onClick={onBack} disabled={loading}>
          Back to List
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || saved} // Disable if loading or already saved
        >
          {loading ? <CircularProgress size={24} color="inherit"/> : (saved ? 'Saved' : 'Save Configuration')}
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

      {/* Display context error if save fails */}
      {contextError && snackbarSeverity === 'error' && (
           <Alert severity="error" sx={{ mt: 2 }}>
              Save Error: {contextError}
           </Alert>
       )}
    </Box>
  );
};

export default ConfigEditor;