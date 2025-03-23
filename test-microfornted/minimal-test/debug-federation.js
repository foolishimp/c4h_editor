// file: minimal-test/debug-federation.js
const http = require('http');
const fs = require('fs');
const path = require('path');

// Check if remoteEntry.js exists in both development and build modes
function checkRemoteEntryFile() {
  console.log('Checking for remoteEntry.js in form project...');
  
  // Check in development mode (public directory)
  const devPath = path.join(__dirname, 'form', 'public', 'remoteEntry.js');
  const devExists = fs.existsSync(devPath);
  console.log(`Development mode (public/remoteEntry.js): ${devExists ? 'EXISTS' : 'MISSING'}`);
  
  // Check in build output (dist directory)
  const buildPath = path.join(__dirname, 'form', 'dist', 'remoteEntry.js');
  const buildExists = fs.existsSync(buildPath);
  console.log(`Build mode (dist/remoteEntry.js): ${buildExists ? 'EXISTS' : 'MISSING'}`);
  
  // Check in assets directory (used by some Vite configurations)
  const assetsPath = path.join(__dirname, 'form', 'dist', 'assets', 'remoteEntry.js');
  const assetsExists = fs.existsSync(assetsPath);
  console.log(`Build mode (dist/assets/remoteEntry.js): ${assetsExists ? 'EXISTS' : 'MISSING'}`);
  
  return { devExists, buildExists, assetsExists };
}

// Try to fetch remoteEntry.js from the running server
function checkServerResponse() {
  return new Promise((resolve) => {
    console.log('\nTrying to fetch remoteEntry.js from running server...');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/remoteEntry.js',
      method: 'GET',
      timeout: 3000
    };
    
    const req = http.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers['content-type'] || 'not specified'}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const firstChars = data.substring(0, 100).replace(/\n/g, '');
        const isHtml = data.includes('<!DOCTYPE html>') || data.includes('<html');
        const isJs = !isHtml && (data.includes('export') || data.includes('function') || data.includes('const'));
        
        console.log(`First 100 chars: ${firstChars}...`);
        console.log(`Content appears to be: ${isHtml ? 'HTML' : isJs ? 'JavaScript' : 'Unknown'}`);
        
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          isHtml,
          isJs
        });
      });
    });
    
    req.on('error', (err) => {
      console.error(`Error: ${err.message}`);
      resolve({
        error: err.message,
        statusCode: null,
        contentType: null,
        isHtml: false,
        isJs: false
      });
    });
    
    req.on('timeout', () => {
      console.log('Request timed out');
      req.destroy();
      resolve({
        error: 'Timeout',
        statusCode: null,
        contentType: null,
        isHtml: false,
        isJs: false
      });
    });
    
    req.end();
  });
}

// Main function to run diagnostics
async function runDiagnostics() {
  console.log('======= MODULE FEDERATION DEBUGGING =======\n');
  
  // Check file system for remoteEntry.js
  const fileCheck = checkRemoteEntryFile();
  
  // Try to access remoteEntry.js from server
  console.log('\nAttempting to connect to form app server...');
  try {
    const serverResponse = await checkServerResponse();
    
    // Provide a summary and recommendations
    console.log('\n======= DIAGNOSTICS SUMMARY =======');
    
    if (fileCheck.buildExists || fileCheck.assetsExists) {
      console.log('✅ remoteEntry.js exists in build output');
    } else {
      console.log('❌ remoteEntry.js not found in build output - might need to build the form app');
    }
    
    if (serverResponse.error) {
      console.log(`❌ Failed to connect to server: ${serverResponse.error}`);
      console.log('   Is the form app running on port 3001?');
    } else if (serverResponse.isHtml) {
      console.log('❌ Server returned HTML instead of JavaScript for remoteEntry.js');
      console.log('   This is likely why Module Federation is failing');
      console.log('   Recommendations:');
      console.log('   1. Check Vite configuration for the form app');
      console.log('   2. Make sure the Module Federation plugin is correctly configured');
      console.log('   3. Ensure server is configured to serve static files correctly');
    } else if (serverResponse.isJs) {
      console.log('✅ Server returned JavaScript for remoteEntry.js');
      console.log('   If the shell app is still failing, check:');
      console.log('   1. CORS settings');
      console.log('   2. Correct import path in the shell app');
    } else {
      console.log('❓ Server returned unknown content type for remoteEntry.js');
      console.log(`   Content-Type: ${serverResponse.contentType || 'not specified'}`);
    }
    
    console.log('\n======= POTENTIAL FIXES =======');
    console.log('1. Try preview mode instead of dev server:');
    console.log('   - Run: cd form && npm run build && npm run preview');
    console.log('2. Check vite.config.ts in the form app:');
    console.log('   - Ensure the federation plugin is correctly configured');
    console.log('   - Try setting `deps: false` in the federation plugin config');
    console.log('3. For the shell app, try these remoteEntry.js URLs:');
    console.log('   - Dev mode: http://localhost:3001/remoteEntry.js');
    console.log('   - Preview mode: http://localhost:3001/assets/remoteEntry.js');
    
    console.log('\n======= END OF DIAGNOSTICS =======');
  } catch (err) {
    console.error('Error running diagnostics:', err);
  }
}

// Run the diagnostics
runDiagnostics();
