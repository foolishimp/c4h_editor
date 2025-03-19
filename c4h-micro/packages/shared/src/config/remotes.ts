// File: packages/shared/src/config/remotes.ts
/**
 * Module Federation Remotes Registry
 * 
 * This file defines the URLs for all remote microfrontends.
 */

export const remotes = {
  yamlEditor: 'http://localhost:3002/remoteEntry.js',
  configSelector: 'http://localhost:3003/remoteEntry.js',
  jobManagement: 'http://localhost:3004/remoteEntry.js'
};

export default remotes;