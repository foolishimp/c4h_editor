// File: verify-remotes.js
// Run this with: node verify-remotes.js

const http = require('http');

const remotes = [
  { name: 'yaml-editor', url: 'http://localhost:3002/remoteEntry.js' },
  { name: 'config-selector', url: 'http://localhost:3003/remoteEntry.js' },
  { name: 'job-management', url: 'http://localhost:3004/remoteEntry.js' },
  { name: 'config-editor', url: 'http://localhost:3001/remoteEntry.js' }
];

// Function to check if a URL is accessible
function checkUrl(remote) {
  return new Promise((resolve) => {
    // Parse the URL to get hostname and path
    const parsedUrl = new URL(remote.url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname,
      method: 'GET',
      timeout: 3000
    };
    
    console.log(`Checking ${remote.name} at ${remote.url}...`);
    
    const req = http.request(options, (res) => {
      console.log(`${remote.name} status: ${res.statusCode}`);
      
      // Collect response data to check content
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode < 400;
        if (success) {
          // Check if content starts with expected Module Federation output
          const isRemoteEntry = data.includes('__webpack_require__') || 
                               data.includes('__federation_shared_scope__');
          
          if (isRemoteEntry) {
            console.log(`✅ ${remote.name}: Valid remoteEntry.js file`);
          } else {
            console.log(`⚠️ ${remote.name}: File exists but doesn't look like a remoteEntry.js file`);
          }
        }
        resolve(success);
      });
    });
    
    req.on('error', (err) => {
      console.error(`❌ Error checking ${remote.name}: ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error(`❌ Timeout checking ${remote.name}`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Check all remotes
async function checkAllRemotes() {
  console.log('Verifying remote entry files...');
  
  for (const remote of remotes) {
    await checkUrl(remote);
  }
  
  console.log('\nTroubleshooting tips if any checks failed:');
  console.log('1. Make sure all microfrontend servers are running');
  console.log('2. Verify that the build output includes remoteEntry.js at the root of dist/');
  console.log('3. Check for CORS issues in browser dev tools');
  console.log('4. Try rebuilding with the production script');
}

checkAllRemotes();