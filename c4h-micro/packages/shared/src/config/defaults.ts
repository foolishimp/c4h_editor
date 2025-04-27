/**
 * /packages/shared/src/config/defaults.ts
 * Defines default values for configuration structures.
 * NOTE: This default object might not be directly used by the application,
 * as the configuration is primarily fetched from the shell_service.
 * However, it needs to conform to the ShellConfigurationResponse type
 * for type checking during the build process.
 */
import { ShellConfigurationResponse, Preferences, Frame, AppAssignment, AppDefinition, LayoutDefinition, ServiceEndpoints } from '../types/shell';

// Define default AppAssignment including windowId
const defaultAppAssignment: AppAssignment = { appId: 'test-app', windowId: 1 };

// Define a default Frame including layoutId and windowId in assignedApps
const defaultFrame: Frame = {
  id: 'default-frame-1',
  name: 'Default Tab',
  order: 0,
  layoutId: 'single-pane', // Assume a default layout ID might exist
  assignedApps: [defaultAppAssignment]
};

// Define default Preferences
const defaultPreferences: Preferences = {
  frames: [defaultFrame]
};

// Define default available apps
const defaultAvailableApps: AppDefinition[] = [
    {
      id: 'test-app',
      name: 'Test App',
      type: 'ESM', // Required property
      url: '', // URL resolved by shell service
      // Legacy fields if needed by any part of the code (otherwise remove)
      scope: 'testApp',
      module: './TestApp'
    }
];

// Define default layouts (empty array is valid)
const defaultLayouts: LayoutDefinition[] = [];

// Define default service endpoints
const defaultServiceEndpoints: ServiceEndpoints = {
    jobConfigServiceUrl: 'http://localhost:8000' // Example default
};

// Ensure the default object matches the ShellConfigurationResponse structure
export const defaultShellConfiguration: ShellConfigurationResponse = {
  preferences: defaultPreferences,
  // Keep frames for potential backward compatibility if needed
  frames: defaultPreferences.frames,
  // Deprecated - remove if confirmed unused
  mainBackendUrl: 'http://localhost:8000',
  availableApps: defaultAvailableApps,
  layouts: defaultLayouts, // Ensure layouts property is present
  serviceEndpoints: defaultServiceEndpoints
};