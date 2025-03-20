// File: c4h-micro/packages/shared/src/config/remotes.ts
/**
 * Module Federation Remotes Registry
 * 
 * This file defines the URLs for all remote microfrontends.
 * Updated to include explicit, absolute URLs with protocol.
 */

export const remotes = {
  configEditor: 'http://localhost:3001/remoteEntry.js',
  yamlEditor: 'http://localhost:3002/remoteEntry.js',
  configSelector: 'http://localhost:3003/remoteEntry.js',
  jobManagement: 'http://localhost:3004/remoteEntry.js'
};

export default remotes;