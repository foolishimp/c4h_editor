// File: packages/job-management/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { CssBaseline } from '@mui/material';
import singleSpaReact from 'single-spa-react';
import JobManager from './JobManager';

const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: JobManager,
  // --- FIX: Added types for errorBoundary parameters ---
  errorBoundary(err: Error, info: React.ErrorInfo, props: any) {
  // --- END FIX ---
    console.error("JobManager MFE Error:", err, info, props);
    // Provide a fallback UI using React.createElement as JSX isn't allowed directly here
    return React.createElement('div', { style: { padding: '1em', color: 'red', border: '1px solid red' } }, 'Error loading Job Manager component.');
  },
});

export const { bootstrap, mount, unmount } = lifecycles;

// Keep CssBaseline export if potentially needed elsewhere, otherwise remove
export { CssBaseline };