// File: packages/shared/src/index.ts
/**
 * Main entry point for shared package
 * Exports all shared types, utilities, and components
 */

// Export shared types
export * from './types/workorder';
export * from './types/job';
export * from './types/config';

// Export config registry
export * from './config/configTypes';
export * from './config/remotes';

// Export utils
export { default as eventBus } from './utils/eventBus';

// Export shared components
export { default as TimeAgo } from './components/TimeAgo';
export { default as DiffViewer } from './components/DiffViewer';

// Export API config
export { default as api, API_ENDPOINTS } from './config/api';
