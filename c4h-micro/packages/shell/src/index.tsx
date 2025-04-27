/**
 * /packages/shell/src/index.tsx
 * Shell application entry point using native ESM
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { eventBus } from 'shared';
 
// Make critical services globally available for all microfrontends
// Set shell service URL global for MFE bootstrap process
(window as any).__C4H_SHELL_SERVICE_URL__ = import.meta.env.VITE_PREFS_SERVICE_URL || 'http://localhost:8011';

// This allows iframe MFEs or others to access it via window
(window as any).__C4H_EVENT_BUS__ = eventBus;
 
// React 18 createRoot API
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);