/**
 * Main entry point for shared package
 * Exports all shared types, utilities, components and services
 */

// Export shared types
export * from './types/workorder';
export * from './types/job';
export * from './types/config';
export * from './types/shell'; // <-- ADDED EXPORT for shell types

// Export config registry
export * from './config/configTypes';
export * from './config/remotes';

// Export utils
export { eventBus, EventDetail } from './utils/eventBus';

// Export shared components
export { default as TimeAgo } from './components/TimeAgo';
export { default as DiffViewer } from './components/DiffViewer';
export { default as RemoteComponent } from './components/RemoteComponent';

// Export API service AND configuration function
export { apiService, api, configureApiService } from './services/apiService'; // <-- ADDED configureApiService
export { API_ENDPOINTS } from './config/api';