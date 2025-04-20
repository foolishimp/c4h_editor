// File: packages/config-selector/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom';
import singleSpaReact from 'single-spa-react';
// import your real root component
import ConfigManager from './ConfigManager';

interface ConfigManagerCustomProps {
  configType: string;
  configId?: string;
  onNavigateBack?: () => void;
  onNavigateTo?: (configId: string) => void;
}

interface RootComponentProps {
  name: string;
  mountParcel?: (parcelConfig: any, customProps: object) => any;
  domElement?: HTMLElement;
  customProps: ConfigManagerCustomProps;
  [key: string]: any;
}

const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: (props: RootComponentProps) => {
    // sanity check
    if (!props.customProps?.configType) {
      console.error("ConfigManager MFE Error: Missing required 'configType'");
      return React.createElement(
        'div',
        { style: { padding: '1em', color: 'red', border: '1px solid red' } },
        'Error: configType prop missing.'
      );
    }
    // pass only the props your component needs
    return (
      <ConfigManager
        {...props.customProps}
        domElement={props.domElement}
      />
    );
  },
  // remove the unused `props` parameter here
  errorBoundary(err: Error, info: React.ErrorInfo) {
    console.error("ConfigSelector MFE Error:", err, info);
    return React.createElement(
      'div',
      { style: { padding: '1em', color: 'red', border: '1px solid red' } },
      `Error loading Config Selector: ${err.message}`
    );
  },
});

// export the lifecycles that single‑spa needs
export const { bootstrap, mount, unmount } = lifecycles;
