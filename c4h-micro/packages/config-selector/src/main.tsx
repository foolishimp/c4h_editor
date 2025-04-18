// File: packages/config-selector/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import singleSpaReact from 'single-spa-react';
import ConfigManager from './ConfigManager';

// Create Single-SPA lifecycle functions
const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: ConfigManager,
  errorBoundary(err: Error, info: React.ErrorInfo, props: any) {
    console.error("ConfigSelector MFE Error:", err, info, props);
    return React.createElement('div', null, 'Error loading Config Selector.');
  },
});

// Export Single-SPA lifecycle functions
export const { bootstrap, mount, unmount } = lifecycles;