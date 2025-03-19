// File: packages/job-management/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, Container } from '@mui/material';
import JobManager from './JobManager';

// Simple standalone app
const App = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <JobManager />
    </Container>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);
