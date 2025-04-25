/**
 * /packages/job-management/src/main.tsx
 * Export JobManager with proper providers to prevent context errors
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import JobManager from './JobManager';
import { JobProvider } from './contexts/JobContext';

// Define props interface for mount function
interface MountProps {
  domElement: HTMLElement;
  customProps?: {
    showJobCreator?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

// Create a theme matching the shell
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

// Export the component directly
export default JobManager;

/**
 * Mount function called by the shell
 */
export function mount(props: MountProps) {
  const { domElement, customProps = {} } = props;
  
  // Create root once
  const root = createRoot(domElement);
  
  // Render with all necessary providers
  root.render(
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <JobProvider>
          <JobManager {...customProps} />
        </JobProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
  
  return {
    unmount() {
      root.unmount();
    }
  };
}