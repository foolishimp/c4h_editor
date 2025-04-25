/**
 * /packages/test-app/src/main.tsx
 * Entry point for test-app microfrontend
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import TestApp from './TestApp';

/**
 * Export the default component for ESM imports
 */
export default TestApp;

/**
 * Optional mount function for compatibility with different consumption patterns
 * @param props - Properties including DOM element to mount into
 * @returns Object with unmount method
 */
export function mount(props: any) {
  const { domElement, ...restProps } = props;
  
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