// File: packages/shared/src/config/remotes.ts
/**
 * Module Federation Remotes Registry
 * 
 * This file defines the URLs for all remote microfrontends.
 * The paths should point directly to the remoteEntry.js files.
 */

// Define the remotes with absolute URLs to ensure consistent resolution
export const remotes: Record<string, string> = {
  configEditor: 'http://localhost:3001/remoteEntry.js',
  yamlEditor: 'http://localhost:3002/remoteEntry.js',
  configSelector: 'http://localhost:3003/remoteEntry.js',
  jobManagement: 'http://localhost:3004/remoteEntry.js'
};

// Export as both named export and default export for flexibility
export default remotes;