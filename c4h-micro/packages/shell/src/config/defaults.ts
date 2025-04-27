// Fix in config/defaults.ts
import { ShellConfigurationResponse } from 'shared';

export const defaultShellConfiguration: ShellConfigurationResponse = {
  preferences: { // Assuming Preferences also just needs frames for default
    frames: [
      {
        id: 'default-frame-1', // Use a more descriptive default ID
        name: 'Default Tab',
        order: 0,
        layoutId: 'single-pane', // Default to single-pane if available
        assignedApps: [{ appId: 'test-app', windowId: 1 }] // Add windowId
      }
    ]
  },
  // Keep frames for potential backward compatibility if something still reads it directly
  frames: [
    {
      id: 'default-frame-1',
      name: 'Default Tab',
      order: 0,
      layoutId: 'single-pane',
      assignedApps: [{ appId: 'test-app', windowId: 1 }] // Add windowId
    }
  ],
  // Deprecated? Keep for now if needed elsewhere, but preferences.frames is primary
  mainBackendUrl: 'http://localhost:8000', // This seems unused now, jobConfigServiceUrl is primary
  availableApps: [
    {
      id: 'test-app',
      name: 'Test App',
      type: 'ESM', // Added required property
      url: '', // URL should be resolved by shell service
      scope: 'testApp', // Optional legacy property
      module: './TestApp' // Optional legacy property
    }
    // Add other known apps if needed for defaults, though shell_service DB is primary source
  ],
  // ADDED: layouts property to satisfy the type
  layouts: [], // Default to empty array
  serviceEndpoints: {
      jobConfigServiceUrl: 'http://localhost:8000' // Default backend URL
  }
};