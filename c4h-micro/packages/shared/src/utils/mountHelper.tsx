/**
 * /packages/shared/src/utils/mountHelper.ts
 * Standardized mount helper for microfrontends
 * Ensures proper context providers and event bus integration
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { eventBus } from './eventBus';
import { EventTypes } from '../types/events';

// Define the expected shape of the helper props separate from component props P
interface MountHelperProps {
    configType?: string;
    onNavigateTo?: (id: string) => void;
    onNavigateBack?: () => void;
}

// Update MountOptions: props combines Component props P and optional helper props
export interface MountOptions<P = Record<string, any>> { // Default P to Record<string, any> if not provided
  domElement: HTMLElement;
  Component: React.ComponentType<P>;
  // props now clearly includes optional helper props alongside component props P
  props?: P & MountHelperProps & Record<string, any>; // Allow other arbitrary props
  appId?: string;
  onUnmount?: () => void;
}

/**
 * Creates a standardized mounter function for MFEs
 * Ensures consistent provider wrapping and event handling
 */
/**
 * Creates a standardized mounter function for MFEs
 * Ensures consistent provider wrapping and event handling
 */
export function createMounter<P = Record<string, any>>(options: MountOptions<P>) {
  // Ensure props defaults correctly even if undefined
  const { domElement, Component, props = {} as P & MountHelperProps, appId = '', onUnmount } = options;

  // Normalize config type from props.configType (now explicitly part of type) or appId
  const configType = normalizeConfigType(props.configType || appId);

  // Add navigation handlers with fallbacks, accessing props safely
  const enhancedProps: P & { configType: string; onNavigateTo: (id: string) => void; onNavigateBack: () => void } = {
    ...(props as P), // Spread the original component props
    configType,      // Add normalized configType
    onNavigateTo: props.onNavigateTo || ((id: string) => { // Use provided or fallback
      console.log(`[MountHelper] Using fallback navigation for navigateTo:`, id);
      eventBus.publish(EventTypes.NAVIGATION_REQUEST, {
        source: appId,
        payload: { action: 'navigateTo', target: id, from: appId }
      });
    }),
    onNavigateBack: props.onNavigateBack || (() => { // Use provided or fallback
      console.log(`[MountHelper] Using fallback navigation for back`);
      eventBus.publish(EventTypes.NAVIGATION_REQUEST, {
        source: appId,
        payload: { action: 'back', from: appId }
      });
    })
    // Note: We are explicitly adding these props, overriding any potential conflicts from P
  };

  // Create root and render with all required providers using correct JSX syntax
  const root = createRoot(domElement);

  // *** THIS IS THE CORRECTED JSX BLOCK ***
  root.render(
    <React.StrictMode>
      <StyledEngineProvider injectFirst> {/* Use as element, pass prop */}
        <ThemeProvider theme={createTheme()}> {/* Use as element, pass prop */}
          <CssBaseline /> {/* Use as self-closing element */}
          {/* Pass the enhanced props to the actual Component */}
          <Component {...enhancedProps} />
        </ThemeProvider>
      </StyledEngineProvider>
    </React.StrictMode>
  );
  // *** END OF CORRECTED JSX BLOCK ***

  // Return unmount function
  return {
    unmount: () => {
      console.log(`[MountHelper] Unmounting component with appId:`, appId);
      root.unmount();
      if (onUnmount) onUnmount();
    }
  };
}

// Keep the rest of the file (imports, interfaces, normalizeConfigType) as it was in the previous correct version.

/**
 * Helper to normalize config types between plural and singular forms
 */
function normalizeConfigType(configType: string): string {
  if (!configType) return '';

  // Remove 'config-selector-' prefix if present
  const withoutPrefix = configType.replace(/^config-selector-/, '');

  // Convert plural to singular if needed
  // Make sure it's not a word naturally ending in 's' that we shouldn't change (simple check)
  if (withoutPrefix.length > 1 && withoutPrefix.endsWith('s') && !withoutPrefix.endsWith('us')) {
      // Basic check for common plurals - might need refinement for irregular nouns
       return withoutPrefix.slice(0, -1);
  }

  return withoutPrefix;
}