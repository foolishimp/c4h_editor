/**
 * /packages/yaml-editor/src/main.tsx
 * Properly exports YamlEditor with required providers
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import YamlEditor from './YamlEditor';
import { bootstrapConfig } from 'shared';

// Export the component
export default YamlEditor;

/**
 * Bootstrap function for yaml-editor MFE
 * Called by shell when mounting to ensure proper configuration
 */
export async function bootstrapMfe(mfeId: string) {
  console.log(`YamlEditor: Bootstrap called for ${mfeId}`);
  
  try {
    const result = await bootstrapConfig(mfeId);
    if (!result.success) {
      console.error(`YamlEditor: Bootstrap failed: ${result.error}`);
      return { success: false, error: result.error };
    }
    return { success: true, config: result.config };
  } catch (error) {
    console.error(`YamlEditor: Bootstrap error:`, error);
    return { success: false, error };
  }
}

/**
 * Mount function for dynamic loading
 * Includes all required providers following MFE Guidelines
 */
export function mount(props: any) {
  const { domElement, customProps = {} } = props;
  
  console.log('YamlEditor: Mounting with props:', customProps);

  // Call bootstrap when mounted
  bootstrapMfe(customProps.appId || 'yaml-editor')
    .catch(err => console.error(`YamlEditor: Bootstrap error during mount:`, err));
  
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