/**
 * /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/shell/src/index.tsx
 * Shell application entry point that renders the main App component
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { eventBus } from 'shared';
 
// Make event bus globally available for all microfrontends
(window as any).__C4H_EVENT_BUS__ = eventBus;

// React 18 createRoot API
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);