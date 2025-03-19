// File: scripts/debug-federation.js
// A script to validate that the remoteEntry.js files are properly accessible and formatted
const http = require('http');
const fs = require('fs');

const remotes = [
  { name: 'yaml-editor', url: 'http://localhost:3002/remoteEntry.js' },
  { name: 'config-selector', url: 'http://localhost:3003/remoteEntry.js' },
  { name: 'job-management', url: 'http://localhost:3004/remoteEntry.js' },
  { name: 'config-editor', url: 'http://localhost:3001/remoteEntry.js' }
];

// Function to fetch content from URL and save to file
function fetchAndSaveContent(remote) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(remote.url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname,
      method: 'GET',
      timeout: 5000
    };
    
    console.log(`Fetching ${remote.name} from ${remote.url}...`);
    
    const req = http.request(options, (res) => {
      const statusCode = res.statusCode;
      console.log(`${remote.name} status: ${statusCode}`);
      
      if (statusCode !== 200) {
        reject(new Error(`Failed to fetch ${remote.name}: HTTP status ${statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const fileName = `./debug-${remote.name}.js`;
        fs.writeFileSync(fileName, data);
        
        // Check if the content looks like a valid Module Federation output
        const hasFederationCode = data.includes('__webpack_require__') || 
                                data.includes('__federation_shared_scope__');
        
        if (hasFederationCode) {
          console.log(`✅ ${remote.name}: Valid Module Federation remoteEntry saved to ${fileName}`);
          
          // Check for potential Module Federation initialization issues
          const hasInitFn = data.includes('init(');
          const hasShareScope = data.includes('shareScope');
          
          if (!hasInitFn || !hasShareScope) {
            console.warn(`⚠️ ${remote.name}: Missing init function or shareScope. This might cause federation issues.`);
          }
          
          resolve(true);
        } else {
          console.error(`❌ ${remote.name}: Content doesn't look like a Module Federation remoteEntry`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error(`❌ Error fetching ${remote.name}: ${err.message}`);
      reject(err);
    });
    
    req.on('timeout', () => {
      console.error(`❌ Timeout fetching ${remote.name}`);
      req.destroy();
      reject(new Error(`Timeout fetching ${remote.name}`));
    });
    
    req.end();
  });
}

async function checkAllRemotes() {
  console.log('Checking and saving remoteEntry.js files for debugging...');
  
  try {
    // Create results directory if it doesn't exist
    if (!fs.existsSync('./debug-results')) {
      fs.mkdirSync('./debug-results');
    }
    
    for (const remote of remotes) {
      try {
        await fetchAndSaveContent(remote);
      } catch (err) {
        console.error(`Failed to process ${remote.name}: ${err.message}`);
      }
    }
    
    console.log('\nDebug summary:');
    console.log('The debug-*.js files have been saved for inspection.');
    console.log('\nPossible issues to check:');
    console.log('1. Ensure all remoteEntry.js files are properly formatted for Module Federation');
    console.log('2. Check that init() functions and shareScopes are properly defined');
    console.log('3. Verify webpack externals and shared dependencies are consistent');
    console.log('4. Make sure CORS is enabled on all microfrontend servers');
  } catch (err) {
    console.error('Debug process failed:', err);
  }
}

checkAllRemotes();