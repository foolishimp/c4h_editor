// File: scripts/dev-direct.js
/**
 * A direct development script that handles building and serving in the right order
 * for Module Federation to work correctly with Vite.
 */
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
      if (stderr && !stderr.includes('warning')) {
        console.warn(`Command Warning: ${stderr}`);
      }
      console.log(`Command Output: ${stdout}`);
      resolve(stdout);
    });
    
    childProcess.stdout.on('data', (data) => {
      console.log(`${data.toString().trim()}`);
    });
    
    childProcess.stderr.on('data', (data) => {
      console.warn(`${data.toString().trim()}`);
    });
  });
}

// Main function
async function main() {
  try {
    console.log('Setting up development environment...');
    
    // 1. Make sure shared package is built
    console.log('Building shared package...');
    await runCommand('npm run build:shared');
    
    // 2. Build the config-editor
    console.log('Building config-editor...');
    await runCommand('npm run build', path.join(rootDir, 'packages', 'config-editor'));
    
    // 3. Start the processes
    console.log('Starting servers...');
    
    // Start config-editor preview (serve built files)
    const configPreviewProcess = spawn('npm', ['run', 'preview'], {
      cwd: path.join(rootDir, 'packages', 'config-editor'),
      stdio: 'inherit',
      shell: true
    });
    
    // Wait a bit for the preview server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start shell development server
    const shellProcess = spawn('npm', ['run', 'start'], {
      cwd: path.join(rootDir, 'packages', 'shell'),
      stdio: 'inherit',
      shell: true
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('Shutting down...');
      configPreviewProcess.kill();
      shellProcess.kill();
      process.exit(0);
    });
    
    console.log('\n--------------------------------------------------');
    console.log('Development environment running:');
    console.log('- Config Editor preview: http://localhost:3001');
    console.log('- Shell app: http://localhost:3000');
    console.log('--------------------------------------------------\n');
    
  } catch (error) {
    console.error('Error setting up development environment:', error);
    process.exit(1);
  }
}

// Run the main function
main();