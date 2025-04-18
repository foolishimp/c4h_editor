import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Snackbar, Alert } from '@mui/material';
import { useConfigContext } from '../contexts/ConfigContext';

interface ConfigEditorProps {
  configId: string; // Reserved for future use, e.g., fetching specific config
  onBack: () => void; // Reserved for future use, e.g., navigation
  yamlEditorComponent?: React.ComponentType<{
    yaml: string;
    onChange: (newYaml: string) => void;
    onSave: () => void;
    title: string;
    description: string;
  }>;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ configId, onBack, yamlEditorComponent: YamlEditor }) => {
  const { configName, configData, updateConfig } = useConfigContext();
  const [yaml, setYaml] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (configData) {
      setYaml(configData.yaml || '');
    }
  }, [configData]);

  const handleYamlChange = useCallback((newYaml: string) => {
    setYaml(newYaml);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updateConfig({ yaml });
      setOpenSnackbar(true);
      setError(null);
    } catch (err) {
      setError('Failed to save configuration');
      console.error(err);
    }
  }, [yaml, updateConfig]);

  const renderYamlEditor = () => {
    if (YamlEditor) {
      return (
        <YamlEditor
          yaml={yaml}
          onChange={handleYamlChange}
          onSave={handleSave}
          title={`${configName} Configuration`}
          description={`Edit the ${configName.toLowerCase()} configuration in YAML format.`}
        />
      );
    } else {
      return (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" color="error">YAML Editor not available</Typography>
          <Typography>Please ensure the YAML Editor is configured in the shell.</Typography>
        </Paper>
      );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {configName} Config Editor
      </Typography>
      {renderYamlEditor()}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Configuration saved successfully!
        </Alert>
      </Snackbar>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ConfigEditor;