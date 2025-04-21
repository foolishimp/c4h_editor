/**
 * Main entry point for shared package
 * Exports all shared types, utilities, components and services
 */

// Use 'export type' for modules that primarily export types,
// required when 'isolatedModules' is true in tsconfig.
export type * from './types/workorder';
export type * from './types/job';
export type * from './types/config';
export * from './types/shell';           // Export both types and values directly
export * from './types/iframe';          // Export IframeMessage directly
export * from './types/events';          // Export EventDetail directly

// Use regular 'export' for modules that export runtime values (or mixed)
export * from './config/configTypes';
export * from './config/remotes';        // Ensure this doesn't ONLY export types

// Export runtime utilities/values
export { eventBus } from './utils/eventBus';

// Export shared components (runtime values)
export { default as TimeAgo } from './components/TimeAgo';
export { default as DiffViewer } from './components/DiffViewer';
export { default as RemoteComponent } from './components/RemoteComponent';

// Export API service (runtime values) AND configuration function
export { apiService, api, configureApiService } from './services/apiService';
export { API_ENDPOINTS } from './config/api';