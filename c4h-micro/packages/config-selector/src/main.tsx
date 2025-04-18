// File: packages/config-selector/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import singleSpaReact from 'single-spa-react';
// Removed problematic 'AppProps' import
import ConfigManager from './ConfigManager';
import type { ParcelConfig } from 'single-spa'; // Import ParcelConfig type if needed elsewhere, otherwise can remove

// --- Define Props Interfaces ---

// Define the custom props expected from the shell inside 'customProps'
interface ConfigManagerCustomProps {
  configType: string;
  configId?: string;
  onNavigateBack?: () => void;
  onNavigateTo?: (configId: string) => void;
}

// Define the props structure passed by single-spa-react, including standard props and our custom ones
// Based on single-spa-react documentation/common usage
interface RootComponentProps {
  // Standard props from single-spa / single-spa-react
  name: string; // Application name
  mountParcel?: (parcelConfig: ParcelConfig, customProps: object) => any; // Function to mount parcels
  singleSpa?: any; // The single-spa instance
  domElement?: HTMLElement; // The DOM element provided for mounting

  // Our custom props nested under 'customProps'
  customProps: ConfigManagerCustomProps;

  // Allow other potential props passed by single-spa
  [key: string]: any;
}

// --- Create Single-SPA Lifecycles ---

const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  // Type the props parameter using our defined interface
  rootComponent: (props: RootComponentProps) => {
    // Pass down custom props from the nested object
    // Also pass standard single-spa props like domElement if needed by ConfigManager
    if (!props.customProps?.configType) {
        console.error("ConfigManager MFE Error: Missing required 'configType' in customProps!");
        return React.createElement('div', { style: { padding: '20px', color: 'red', border: '1px solid red' } }, 'Error: configType prop missing.');
    }

    return (
      <ConfigManager
        // Spread custom props from the nested object
        {...props.customProps}
        // Pass standard single-spa props if ConfigManager's interface expects them
        domElement={props.domElement}
        // Pass other standard props if needed
        // name={props.name}
        // mountParcel={props.mountParcel}
      />
    );
  },
  // Remove unused props parameter from errorBoundary
  errorBoundary(err: Error, info: React.ErrorInfo /* Removed props */) {
    console.error("ConfigSelector MFE Error:", err, info);
    // Fallback UI
    return React.createElement('div', { style: { padding: '20px', color: 'red', border: '1px solid red' } }, 'Error loading Config Selector: ', err.message);
  },
});

// Export Single-SPA lifecycle functions
export const { bootstrap, mount, unmount } = lifecycles;