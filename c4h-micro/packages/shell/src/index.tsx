/**
 * /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/shell/src/index.tsx
 * Shell application entry point that renders the main App component
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { mountRootParcel } from 'single-spa';
import App from './App';

// Make mountRootParcel available globally for the frame component
(window as any).mountRootParcel = mountRootParcel;

// Single-SPA registration will happen dynamically in App.tsx after config load

// React 18 createRoot API
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);