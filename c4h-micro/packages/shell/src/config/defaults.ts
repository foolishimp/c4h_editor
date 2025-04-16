/**
 * Default configuration for the Shell application.
 * Used as a fallback if fetching configuration from the Preferences service fails.
 */

// Corrected imports from 'shared' after exporting types from index.ts
import {
  ShellConfigurationResponse,
  Frame,
  AppDefinition
} from 'shared';

const DEFAULT_JOB_CONFIG_URL = 'http://localhost:8000'; // Default backend URL

// Default Available Apps
const defaultAvailableApps: AppDefinition[] = [
  { id: 'config-selector', name: 'Configuration Manager', scope: 'configSelector', module: './ConfigManager' },
  { id: 'job-management', name: 'Job Manager', scope: 'jobManagement', module: './JobManager' },
  { id: 'yaml-editor', name: 'YAML Editor', scope: 'yamlEditor', module: './YamlEditor' },
];

// Default Frames Layout
const defaultFrames: Frame[] = [
  {
    id: 'frame-configs', // Give it a unique ID
    name: 'Configurations',
    order: 0,
    assignedApps: [{ appId: 'config-selector' }] // Removed cast, should match type now
  },
  {
    id: 'frame-jobs',
    name: 'Jobs',
    order: 1,
    assignedApps: [{ appId: 'job-management' }]
  }
];

export const defaultShellConfiguration: ShellConfigurationResponse = {
  frames: defaultFrames,
  availableApps: defaultAvailableApps,
  serviceEndpoints: {
    jobConfigServiceUrl: DEFAULT_JOB_CONFIG_URL
  }
};