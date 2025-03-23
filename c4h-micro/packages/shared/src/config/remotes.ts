// File: /packages/shared/src/config/remotes.ts
/**
 * Module Federation Remotes Registry
 * 
 * This file defines the URLs for all remote microfrontends.
 * Updated to use assets/remoteEntry.js which is where Vite puts them by default.
 */

export const remotes = {
  configEditor: 'http://localhost:3001/assets/remoteEntry.js',
  yamlEditor: 'http://localhost:3002/assets/remoteEntry.js',
  configSelector: 'http://localhost:3003/assets/remoteEntry.js',
  jobManagement: 'http://localhost:3004/assets/remoteEntry.js'
};

export default remotes;