/**
 * /packages/yaml-editor/src/main.tsx
 * Properly exports YamlEditor with required providers
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import YamlEditor from './YamlEditor';

// Export the component
export default YamlEditor;

/**
 * Mount function for dynamic loading
 * Includes all required providers following MFE Guidelines
 */
export function mount(props: any) {
  const { domElement, customProps = {} } = props;
  
  console.log('YamlEditor: Mounting with props:', customProps);
  
  const root = createRoot(domElement);
  
  root.render(
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={createTheme()}>
        <CssBaseline />
        <YamlEditor {...customProps} />
      </ThemeProvider>
    </StyledEngineProvider>
  );
  
  return {
    unmount() {
      console.log('YamlEditor: Unmounting');
      root.unmount();
    }
  };
}