// File: scripts/setup-dev-environment.js
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Root directory
const rootDir = path.resolve(__dirname, '..');

// Function to run shell commands with promise
function runCommand(command, cwd = rootDir) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} in ${cwd}`);
    
    const childProcess = exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`Command Warning: ${stderr}`);
      }
      console.log(`Command Output: ${stdout}`);
      resolve(stdout);
    });
    
    // Add more detailed logging
    childProcess.stdout.on('data', (data) => {
      console.log(`${data.toString().trim()}`);
    });
    
    childProcess.stderr.on('data', (data) => {
      console.warn(`${data.toString().trim()}`);
    });
  });
}

// Function to ensure a directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Function to check if a URL is reachable
function checkUrl(url) {
  return new Promise((resolve) => {
    console.log(`Checking if ${url} is available...`);
    
    // Parse the URL to get hostname and path
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname,
      method: 'HEAD',
      timeout: 3000
    };
    
    const req = http.request(options, (res) => {
      console.log(`${url} status: ${res.statusCode}`);
      resolve(res.statusCode < 400); // Resolve true if status is 2xx or 3xx
    });
    
    req.on('error', (err) => {
      console.log(`Error checking ${url}: ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`Timeout checking ${url}`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Function to start a process and return it
function startProcess(command, args, cwd = rootDir, name) {
  console.log(`Starting ${name}: ${command} ${args.join(' ')} in ${cwd}`);
  
  ensureDir(cwd); // Ensure directory exists
  
  const childProcess = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });
  
  childProcess.on('error', (error) => {
    console.error(`${name} process error:`, error);
  });
  
  return childProcess;
}

// Function to wait for a server to be up
async function waitForServer(url, maxAttempts = 30, interval = 2000) {
  console.log(`Waiting for ${url} to be available...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isAvailable = await checkUrl(url);
    
    if (isAvailable) {
      console.log(`${url} is now available!`);
      return true;
    }
    
    console.log(`Attempt ${attempt}/${maxAttempts}: ${url} not yet available, waiting ${interval}ms...`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  console.error(`Timed out waiting for ${url} after ${maxAttempts} attempts`);
  return false;
}

// Main function
async function main() {
  try {
    console.log('Starting dev environment setup...');
    console.log(`Working directory: ${rootDir}`);
    
    // Check if node_modules exist and install if needed
    if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
      console.log('Installing dependencies...');
      await runCommand('npm install');
    }
    
    // Ensure directories exist
    const configEditorDir = path.join(rootDir, 'packages', 'config-editor');
    const shellDir = path.join(rootDir, 'packages', 'shell');
    const sharedDir = path.join(rootDir, 'packages', 'shared');
    
    ensureDir(configEditorDir);
    ensureDir(shellDir);
    ensureDir(sharedDir);
    
    // 1. Build shared package first
    console.log('Building shared package...');
    try {
      await runCommand('npm run build:shared');
    } catch (err) {
      console.error('Failed to build shared package:', err);
      process.exit(1);
    }
    
    // 2. Build config-editor
    console.log('Building config-editor...');
    try {
      await runCommand('npm run build', configEditorDir);
    } catch (err) {
      console.error('Failed to build config-editor:', err);
      process.exit(1);
    }
    
    // 3. Start the config-editor preview server
    console.log('Starting config-editor preview server...');
    const configEditorProcess = startProcess('npm', ['run', 'preview'], configEditorDir, 'config-editor');
    
    // 4. Wait for config-editor to be available
    console.log('Waiting for config-editor server to be available...');
    const configEditorAvailable = await waitForServer('http://localhost:3001/remoteEntry.js');
    
    if (!configEditorAvailable) {
      console.error('Config-editor server is not available. Exiting...');
      configEditorProcess.kill();
      process.exit(1);
    }
    
    // 5. Start the shell development server
    console.log('Starting shell development server...');
    const shellProcess = startProcess('npm', ['run', 'start'], shellDir, 'shell');
    
    // 6. Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down...');
      configEditorProcess.kill();
      shellProcess.kill();
      process.exit(0);
    });
    
    console.log('\n\n');
    console.log('------------------------------------------------------------');
    console.log(' Development environment is running:');
    console.log(' - Shell: http://localhost:3000');
    console.log(' - Config Editor: http://localhost:3001');
    console.log('------------------------------------------------------------');
    console.log('\n');
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
main();