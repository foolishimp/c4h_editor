// File: packages/config-selector/src/main.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, Container, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import ConfigManager from './ConfigManager';
import { configTypes } from 'shared';

// Simple demo app for standalone development
const App = () => {
  const [selectedConfigType, setSelectedConfigType] = useState<string>('workorder');

  return (
    <BrowserRouter>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ mb: 4 }}>
          <h1>Config Selector Demo</h1>
          <p>This is a standalone demo of the Config Selector component.</p>
          
          <FormControl fullWidth sx={{ mb: 4 }}>
            <InputLabel id="config-type-label">Configuration Type</InputLabel>
            <Select
              labelId="config-type-label"
              value={selectedConfigType}
              label="Configuration Type"
              onChange={(e) => setSelectedConfigType(e.target.value)}
            >
              {Object.entries(configTypes).map(([key, config]) => (
                <MenuItem key={key} value={key}>{config.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        <Routes>
          <Route path="/" element={<ConfigManager configType={selectedConfigType} />} />
          <Route path="/:configType" element={<ConfigManager />} />
          <Route path="/:configType/:id" element={<ConfigManager />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
