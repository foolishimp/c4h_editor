/**
 * /packages/job-management/src/main.tsx
 * Export JobManager with proper providers to prevent context errors
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import JobManager from './JobManager';
import { bootstrapConfig } from 'shared';
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

/**
 * Bootstrap function for job-management MFE
 * Called by shell when mounting to ensure proper configuration
 */
export async function bootstrapMfe(mfeId: string) {
  console.log(`JobManagement: Bootstrap called for ${mfeId}`);
  
  try {
    const result = await bootstrapConfig(mfeId);
    if (!result.success) {
      console.error(`JobManagement: Bootstrap failed: ${result.error}`);
      return { success: false, error: result.error };
    }
    return { success: true, config: result.config };
  } catch (error) {
    console.error(`JobManagement: Bootstrap error:`, error);
    return { success: false, error };
  }
}

// Export the component directly
export default JobManager;

/**
 * Mount function called by the shell
 */
export function mount(props: MountProps) {
  const { domElement, customProps = {} } = props;

  // Call bootstrap when mounted
  bootstrapMfe(customProps.appId || 'job-management')
    .catch(err => console.error(`JobManagement: Bootstrap error during mount:`, err));
  
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