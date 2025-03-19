// File: packages/yaml-editor/src/main.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, Container, Box } from '@mui/material';
import YamlEditor from './YamlEditor';

// Simple demo app for standalone development
const App = () => {
  const [yaml, setYaml] = useState(`# Example YAML
name: example-config
version: 1.0.0
description: Example configuration
settings:
  enabled: true
  timeout: 30
  features:
    - feature1
    - feature2
`);

  const handleSave = async () => {
    console.log('Saving YAML:', yaml);
    // In standalone mode, just log the YAML
    return Promise.resolve();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <h1>YAML Editor Demo</h1>
        <p>This is a standalone demo of the YAML Editor component.</p>
      </Box>
      <YamlEditor 
        yaml={yaml} 
        onChange={setYaml} 
        onSave={handleSave}
        title="Demo YAML Editor"
        description="Edit this example YAML to test the editor functionality."
      />
    </Container>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);
