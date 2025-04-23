/**
 * /packages/shared/src/index.ts
 * Main entry point for shared package
 * Exports all shared types, utilities, components and services
 */

// Use 'export type' for modules that primarily export types,
// required when 'isolatedModules' is true in tsconfig.
export type * from './types/workorder';
export type * from './types/config';

// Export types and values for job.ts - we need the JobStatus enum as a value
export * from './types/job';           
export * from './types/shell';         
export * from './types/iframe';        
export * from './types/events';        

export * from './utils/bootstrapHelper';
// Use regular 'export' for modules that export runtime values (or mixed)
export * from './config/configTypes';

// Export mount helper utility
export * from './utils/mountHelper';

// Export runtime utilities/values
export { eventBus } from './utils/eventBus';

// Export shared components (runtime values)
export { default as TimeAgo } from './components/TimeAgo';
export { default as DiffViewer } from './components/DiffViewer';

// Export API service (runtime values) AND configuration function
export { apiService, api, configureApiService, checkApiServiceReady } from './services/apiService';
export { API_ENDPOINTS } from './config/api';