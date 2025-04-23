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
 * Map between shell app IDs and normalized config types
 */
const appIdToConfigType: Record<string, string> = {
  'config-selector-workorders': 'workorder',
  'config-selector-teams': 'teamconfig', 
  'config-selector-teamconfigs': 'teamconfig',
  'config-selector-runtime': 'runtimeconfig'
};

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
  const { domElement, appId = '', customProps = {} } = props; // Use appId from props
 
  // Call bootstrap when mounted
  bootstrapMfe(appId)
    .catch(err => console.error(`ConfigSelector: Bootstrap error during mount:`, err));
  
  // Determine config type from app ID or props
  let configType = customProps.configType || 'workorder'; // Default
  
  if (appId) {
    if (appIdToConfigType[appId]) {
      // Direct mapping exists
      configType = appIdToConfigType[appId];
    } else {
      // Try pattern matching
      const matches = appId.match(/config-selector-(\w+)/i);
      if (matches && matches[1]) {
        const extracted = matches[1].toLowerCase();
        
        // Handle plural forms
        if (extracted.endsWith('s') && configTypes[extracted.slice(0, -1)]) {
          configType = extracted.slice(0, -1);
        } else if (configTypes[extracted]) {
          configType = extracted;
        }
      }
    }
  }
  
  console.log(`ConfigSelector: Mount called with configType: ${configType} from appId: ${appId}`);
  
  // Create shell-aware mount function
  const root = createRoot(domElement);
  const render = () => {
    root.render(
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={createTheme()}>
          <CssBaseline />
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