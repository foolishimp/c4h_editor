/**
 * /packages/shared/src/index.ts
 * Main entry point for shared package
 * Exports all shared types, utilities, components and services
 */

// Export types AND values from events.ts (needed for enum EventTypes)
export * from './types/events';

// Use 'export type' for modules that ONLY export types
// Add explicit exports for specific types that were causing issues, alongside the wildcard
export type { LayoutInfoResponse, LayoutDefinition, LayoutWindow, Frame, AppAssignment, ShellConfigurationResponse, ShellPreferencesRequest, AppDefinition, ServiceEndpoints, Preferences, MFEType } from './types/shell';
export type * from './types/shell'; // Keep wildcard for other types in shell.ts
export type * from './types/workorder';
export type * from './types/config';
export * from './types/job'; // Already exports enum value correctly
export type * from './types/iframe';

// Export runtime utilities/values
export * from './utils/bootstrapHelper';
export * from './config/configTypes';
export * from './utils/mountHelper'; // Export mount helper utility
export { eventBus } from './utils/eventBus';

// Export shared components (runtime values)
export { default as TimeAgo } from './components/TimeAgo';
export { default as DiffViewer } from './components/DiffViewer';

// Export API service (runtime values) AND configuration function
export { apiService, api, configureApiService, checkApiServiceReady } from './services/apiService';
export { API_ENDPOINTS } from './config/api';