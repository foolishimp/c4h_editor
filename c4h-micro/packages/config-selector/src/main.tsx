/**
 * /packages/config-selector/src/main.tsx
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConfigManager from './ConfigManager';
import { ConfigProvider } from './contexts/ConfigContext';
import { configTypes, eventBus, EventTypes, bootstrapConfig } from 'shared';


/**
 * Bootstrap function for config-selector MFE
 * Called by shell when mounting to ensure proper configuration
 */
export async function bootstrapMfe(mfeId: string) {
  console.log(`ConfigSelector: Bootstrap called for ${mfeId}`);
  
  try {
    const result = await bootstrapConfig(mfeId);
    if (!result.success) {
      console.error(`ConfigSelector: Bootstrap failed: ${result.error}`);
      return { success: false, error: result.error };
    }
    return { success: true, config: result.config };
  } catch (error) {
    console.error(`ConfigSelector: Bootstrap error:`, error);
    return { success: false, error };
  }
}

/**
 * Mount function for ConfigSelector with proper config type detection
 * and shell readiness check
 */
export function mount(props: any) {
  const { domElement, appId = '', customProps = {} } = props; // Get appId and customProps

  // Call bootstrap when mounted
  bootstrapMfe(appId)
    .catch(err => console.error(`ConfigSelector: Bootstrap error during mount:`, err));

  // *** START SIMPLIFICATION ***
  // Directly use the configType prop passed from the Shell
  const configType = customProps.configType;

  if (!configType) {
      console.error(`ConfigSelector Mount: configType not provided in customProps for appId: ${appId}`);
      // Handle error: Render error message or throw
      domElement.innerHTML = `<div style="color: red; padding: 1em;">Error: Configuration type missing for ${appId}. Ensure shell passes correct props.</div>`;
      return { unmount: () => {} }; // Return minimal unmount
  }
  // *** END SIMPLIFICATION ***

  console.log(`ConfigSelector: Mount called. Using configType='${configType}' from props (appId: ${appId})`);

  // Determine config type from app ID or props
  // Create shell-aware mount function
  const root = createRoot(domElement);
  const render = () => {
    root.render(
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={createTheme()}>
          <CssBaseline />
          {/* Pass the validated configType from props */}
          <ConfigProvider configType={configType} initialConfigId={customProps.configId}>
            <ConfigManager
              configType={configType}
              {...customProps}
              onNavigateTo={customProps.onNavigateTo}
              onNavigateBack={customProps.onNavigateBack}
            />
          </ConfigProvider>
        </ThemeProvider>
      </StyledEngineProvider>
    );
  };
  
  // Initial render
  render();
  
  // Listen for shell config ready event
  const unsubscribe = eventBus.subscribe(EventTypes.SHELL_CONFIG_READY, () => {
    console.log('ConfigSelector: Received shell:config:ready event, re-rendering');
    render();
  });
  
  return { 
    unmount: () => {
      unsubscribe();
      root.unmount();
    }
  };
}

export default ConfigManager;