import React from 'react';
import ReactDOM from 'react-dom';
import TestApp from './App';

// Standalone mode (dev HMR).  Renders directly to #root.
ReactDOM.render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>,
  document.getElementById('root')
);
