// File: packages/config-editor/src/main.tsx
/**
 * Entry point for standalone development
 * This file is not used when the app is consumed as a microfrontend
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import ConfigEditor from './ConfigEditor';

// Simple console log to verify script execution
console.log('Config Editor application bootstrapping...');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConfigEditor />} />
        <Route path="/:id" element={<ConfigEditor />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

console.log('Config Editor render called');
