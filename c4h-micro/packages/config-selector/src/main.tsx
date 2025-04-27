/**
 * /packages/config-selector/src/main.tsx
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConfigManager from './ConfigManager';
import { ConfigProvider } from './contexts/ConfigContext';
// Import runtime values and types needed
import { configTypes, eventBus, EventTypes, bootstrapConfig } from 'shared';

/**
 * Bootstrap function for config-selector MFE
 * Called by shell when mounting to ensure proper configuration
 */
export async function bootstrapMfe(mfeId: string) {
  console.log(`ConfigSelector: Bootstrap called for ${mfeId}`);
  try {
    // Assuming bootstrapConfig is correctly implemented in shared
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
  const { domElement, appId = '', customProps = {} } = props;

  // Call bootstrap when mounted
  bootstrapMfe(appId)
    .catch(err => console.error(`ConfigSelector: Bootstrap error during mount:`, err));

  // Directly use the configType prop passed from the Shell
  const configType = customProps.configType;

  if (!configType) {
      console.error(`ConfigSelector Mount: configType not provided in customProps for appId: ${appId}`);
      domElement.innerHTML = `<div style="color: red; padding: 1em;">Error: Configuration type missing for ${appId}.</div>`;
      return { unmount: () => {} }; // Return minimal unmount
  }

  // Check if configType is valid according to shared registry
  if (!configTypes[configType]) {
       console.error(`ConfigSelector Mount: Invalid configType '${configType}' provided for appId: ${appId}`);
       domElement.innerHTML = `<div style="color: red; padding: 1em;">Error: Invalid configuration type '${configType}'.</div>`;
       return { unmount: () => {} };
  }

  console.log(`ConfigSelector: Mount called. Using configType='${configType}' from props (appId: ${appId})`);

  const root = createRoot(domElement);

  // Define render function to be called initially and on event
  const render = () => {
    console.log(`ConfigSelector: Rendering for configType='${configType}', configId='${customProps.configId}'`);
    root.render(
      <React.StrictMode> {/* Added StrictMode */}
        <StyledEngineProvider injectFirst>
          <ThemeProvider theme={createTheme()}>
            <CssBaseline />
            {/* Pass the validated configType */}
            <ConfigProvider configType={configType} initialConfigId={customProps.configId}>
              <ConfigManager
                configType={configType} // Pass validated configType
                {...customProps} // Pass other custom props
                // These might be passed within customProps now, but keep explicit for clarity
                onNavigateTo={customProps.onNavigateTo}
                onNavigateBack={customProps.onNavigateBack}
              />
            </ConfigProvider>
          </ThemeProvider>
        </StyledEngineProvider>
      </React.StrictMode>
    );
  };

  // Initial render
  render();

  // Listen for shell config ready event to potentially re-render or re-fetch data
  const handleShellReady = () => {
       console.log('ConfigSelector: Received shell:config:ready event, re-rendering (or potentially triggering data fetch)');
       // Re-rendering might be sufficient if context handles data fetching on readiness change
       render();
       // Alternatively, trigger data fetch explicitly if needed:
       // const context = domElement?.__REACT_CONTEXT__?. // Hypothetical way to get context, usually done differently
       // context?.loadConfigs();
  };

  // Use the EventTypes enum value correctly
  const unsubscribe = eventBus.subscribe(EventTypes.SHELL_CONFIG_READY, handleShellReady); // FIXED

  return {
    unmount: () => {
      console.log(`ConfigSelector: Unmounting appId: ${appId}`);
      unsubscribe();
      root.unmount();
    }
  };
}

// Export the component as default if it's intended to be used directly sometimes
// Otherwise, relying on the mount function might be sufficient
export default ConfigManager;