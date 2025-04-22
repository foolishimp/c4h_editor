/**
 * /packages/yaml-editor/src/main.tsx
 * Properly exports YamlEditor with MUI providers to fix context errors
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import YamlEditor from './YamlEditor';

// Create a theme matching the shell
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

// Export default component
export default YamlEditor;

/**
 * Mount function for dynamic loading by shell
 */
export function mount(props: any) {
  const { domElement, customProps = {} } = props;
  
  console.log('Mounting YamlEditor with props:', customProps);
  
  const root = createRoot(domElement);
  
  root.render(
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <YamlEditor {...customProps} />
      </ThemeProvider>
    </StyledEngineProvider>
  );
  
  return {
    unmount() {
      root.unmount();
    }
  };
}