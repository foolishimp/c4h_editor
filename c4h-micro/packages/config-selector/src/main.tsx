/**
 * /packages/config-selector/src/main.tsx
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConfigManager from './ConfigManager';
import { ConfigProvider } from './contexts/ConfigContext';
import { configTypes } from 'shared';

// Define mapping between app IDs and config types
const appIdToConfigType: Record<string, string> = {
  'config-selector-workorders': 'workorder',
  'config-selector-teamconfigs': 'teamconfig',
  'config-selector-runtimeconfigs': 'runtimeconfig'
};

// Create mount function with configType detection
export function mount(props: any) {
  const { domElement, name = '' } = props;
  
  // Determine config type from app ID
  let configType = 'workorder'; // Default
  
  if (name && appIdToConfigType[name]) {
    configType = appIdToConfigType[name];
  } else {
    // Try extracting from pattern
    const matches = name.match(/config-selector-(\w+)/i);
    if (matches && matches[1]) {
      const extracted = matches[1].toLowerCase();
      
      // Check if this is a plural that we need to make singular
      if (extracted.endsWith('s') && configTypes[extracted.slice(0, -1)]) {
        configType = extracted.slice(0, -1);
      } else if (configTypes[extracted]) {
        configType = extracted;
      }
    }
  }
  
  console.log(`Mounting ConfigManager with configType: ${configType} (from app ID: ${name})`);
  
  // Create root and render
  const root = createRoot(domElement);
  root.render(
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={createTheme()}>
        <CssBaseline />
        <ConfigProvider configType={configType}>
          <ConfigManager configType={configType} {...props.customProps} />
        </ConfigProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
  
  return { unmount: () => root.unmount() };
}

export default ConfigManager;