/**
 * /packages/shell/src/index.tsx
 * Shell application entry point using native ESM
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { eventBus } from 'shared';
 
// Make event bus globally available for all microfrontends
// This allows iframe MFEs or others to access it via window
(window as any).__C4H_EVENT_BUS__ = eventBus;
 
// React 18 createRoot API
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);