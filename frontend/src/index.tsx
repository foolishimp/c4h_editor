import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Simple console log to verify script execution
console.log('React application bootstrapping...');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log to verify rendering attempt
console.log('React render called');