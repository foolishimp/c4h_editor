/**
 * /packages/test-app/src/main.tsx
 * Entry point for test-app microfrontend
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import TestApp from './TestApp';
import { bootstrapConfig } from 'shared';

/**
 * Export the default component for ESM imports
 */
export default TestApp;

/**
 * Bootstrap function for test-app MFE
 * Called by shell when mounting to ensure proper configuration
 */
export async function bootstrapMfe(mfeId: string) {
  console.log(`TestApp: Bootstrap called for ${mfeId}`);
  
  try {
    const result = await bootstrapConfig(mfeId);
    if (!result.success) {
      console.error(`TestApp: Bootstrap failed: ${result.error}`);
      return { success: false, error: result.error };
    }
    return { success: true, config: result.config };
  } catch (error) {
    console.error(`TestApp: Bootstrap error:`, error);
    return { success: false, error };
  }
}

/**
 * Optional mount function for compatibility with different consumption patterns
 * @param props - Properties including DOM element to mount into
 * @returns Object with unmount method
 */
export function mount(props: any) {
  const { domElement, ...restProps } = props;

  // Call bootstrap when mounted
  bootstrapMfe(restProps.appId || 'test-app')
    .catch(err => console.error(`TestApp: Bootstrap error during mount:`, err));
  
  // Create a root using React 18's createRoot API
  const root = createRoot(domElement);
  
  // Render the component
  root.render(
    <React.StrictMode>
      <TestApp {...restProps} />
    </React.StrictMode>
  );
  
  // Return an object with unmount method
  return {
    unmount() {
      root.unmount();
    }
  };
}