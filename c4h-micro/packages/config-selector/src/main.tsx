/**
 * /packages/config-selector/src/main.tsx
 * Export ConfigManager with proper providers and config type handling
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ConfigManager from './ConfigManager';
import { ConfigProvider } from './contexts/ConfigContext';

// Define props interface for mount function
interface MountProps {
  domElement: HTMLElement;
  name?: string; // The app name from shell
  configType?: string;
  customProps?: {
    configType?: string;
    configId?: string;
    onNavigateBack?: () => void;
    onNavigateTo?: (configId: string) => void;
    [key: string]: any;
  };
  [key: string]: any;
}

// Map for plural to singular conversion
const configTypeMap: Record<string, string> = {
  'workorders': 'workorder',
  'teamconfigs': 'teamconfig',
  'runtimeconfigs': 'runtimeconfig'
};

// Create a theme matching the shell
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

// Export the component directly
export default ConfigManager;

/**
 * Mount function called by the shell
 */
export function mount(props: MountProps) {
  const { domElement, name = '', configType, customProps = {} } = props;
  
  // Determine config type from multiple sources with priority
  let effectiveConfigType = configType || customProps.configType;
  
  // If not explicitly provided, try to extract from app name/ID
  if (!effectiveConfigType && name) {
    // Parse from app ID pattern like "config-selector-workorders"
    const matches = name.match(/config-selector-(\w+)/);
    if (matches && matches[1]) {
      const extracted = matches[1].toLowerCase();
      // Convert plural to singular if needed
      effectiveConfigType = configTypeMap[extracted] || extracted;
      console.log(`Extracted config type '${effectiveConfigType}' from app name '${name}'`);
    }
  }
  
  // Final fallback
  effectiveConfigType = effectiveConfigType || 'workorder';
  
  console.log(`Mounting ConfigManager with configType: ${effectiveConfigType}`);
  
  // Create root once
  const root = createRoot(domElement);
  
  // Render with all necessary providers
  root.render(
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ConfigProvider configType={effectiveConfigType}>
          <ConfigManager 
            configType={effectiveConfigType}
            {...customProps} 
          />
        </ConfigProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
  
  return {
    unmount() {
      root.unmount();
    }
  };
}