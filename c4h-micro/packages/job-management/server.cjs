// File: packages/job-management/server.cjs
/**
 * Express server for serving the job-management microfrontend
 * with proper CORS headers and JavaScript module handling
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3004;

// Directory where the built files are located
const DIST_DIR = path.join(__dirname, 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

// Enable CORS for all routes
app.use((req, res, next) => {
  // Allow requests from any origin
  res.header('Access-Control-Allow-Origin', '*');
  // Allow specified HTTP methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  // Allow specified headers
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  // Set cache control headers to prevent caching during development
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// IMPORTANT: Handle remoteEntry.js before any other routes
app.get('/remoteEntry.js', (req, res) => {
  // First try to serve the file directly from assets directory 
  const assetPath = path.join(ASSETS_DIR, 'remoteEntry.js');
  
  if (fs.existsSync(assetPath)) {
    console.log(`Serving remoteEntry.js from ${assetPath}`);
    // Set the correct content type and disable caching
    res.set({
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    // Use sendFile with absolute path
    return res.sendFile(assetPath);
  }
  
  // If not found in assets, try the root dist directory
  const rootPath = path.join(DIST_DIR, 'remoteEntry.js');
  if (fs.existsSync(rootPath)) {
    console.log(`Serving remoteEntry.js from ${rootPath}`);
    res.set('Content-Type', 'application/javascript');
    return res.sendFile(rootPath);
  }
  
  // If still not found, return a proper JavaScript error rather than HTML
  console.error('remoteEntry.js not found');
  res.set('Content-Type', 'application/javascript');
  res.status(404).send('console.error("remoteEntry.js not found on server");');
});

// Handle any JavaScript file request
app.get('*.js', (req, res, next) => {
  const fileName = req.path.startsWith('/') ? req.path.substring(1) : req.path;
  
  // Try to find the file in assets directory first
  let filePath = path.join(ASSETS_DIR, fileName);
  
  // If not found in assets, try the root dist directory
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, fileName);
  }
  
  if (fs.existsSync(filePath)) {
    console.log(`Serving JavaScript file from ${filePath}`);
    res.set('Content-Type', 'application/javascript');
    return res.sendFile(filePath);
  }
  
  // Special handling for federation files with dynamic hashes
  if (fileName.includes('__federation_') || fileName.includes('jsx-runtime')) {
    // Extract the base name without extension and hash
    const baseName = path.basename(fileName, '.js').split('.')[0];
    
    // Search in assets directory for files matching the pattern
    if (fs.existsSync(ASSETS_DIR)) {
      const files = fs.readdirSync(ASSETS_DIR);
      const matchingFile = files.find(file => 
        file.includes(baseName) && file.endsWith('.js')
      );
      
      if (matchingFile) {
        filePath = path.join(ASSETS_DIR, matchingFile);
        console.log(`Serving JavaScript file (pattern match) from ${filePath}`);
        res.set('Content-Type', 'application/javascript');
        return res.sendFile(filePath);
      }
    }
  }
  
  // If we've tried everything and still can't find it, continue to the next middleware
  next();
});

// Add a diagnostic endpoint
app.get('/test-remote', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Remote Entry Test</title>
    </head>
    <body>
      <h1>Testing remoteEntry.js</h1>
      <pre id="output"></pre>
      <script>
        const output = document.getElementById('output');
        
        async function testRemoteEntry() {
          try {
            output.textContent += "Fetching remoteEntry.js...\n";
            const response = await fetch('/remoteEntry.js');
            
            if (!response.ok) {
              throw new Error(\`HTTP error: \${response.status}\`);
            }
            
            output.textContent += \`Content-Type: \${response.headers.get('Content-Type')}\n\`;
            const text = await response.text();
            output.textContent += \`Content length: \${text.length} bytes\n\`;
            output.textContent += \`First 100 chars: \${text.substring(0, 100)}\n\`;
            
            // Check if it's HTML
            if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
              output.textContent += "ERROR: Content is HTML, not JavaScript!\n";
            } else {
              output.textContent += "Content appears to be JavaScript\n";
            }
          } catch (error) {
            output.textContent += \`Error: \${error.message}\n\`;
          }
        }
        
        testRemoteEntry();
      </script>
    </body>
    </html>
  `);
});

// List directory contents for debugging
app.get('/list-dir', (req, res) => {
  try {
    let output = 'Directory Contents:\n\n';
    
    output += 'DIST_DIR contents:\n';
    if (fs.existsSync(DIST_DIR)) {
      output += listDirectoryContents(DIST_DIR);
    } else {
      output += 'DIST_DIR does not exist\n';
    }
    
    output += '\nASSETS_DIR contents:\n';
    if (fs.existsSync(ASSETS_DIR)) {
      output += listDirectoryContents(ASSETS_DIR);
    } else {
      output += 'ASSETS_DIR does not exist\n';
    }
    
    res.type('text/plain').send(output);
  } catch (error) {
    res.type('text/plain').send(`Error listing directories: ${error.message}`);
  }
});

function listDirectoryContents(directory, indent = '  ') {
  let output = '';
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stats = fs.statSync(fullPath);
    const relativePath = path.relative(DIST_DIR, fullPath);
    
    if (stats.isDirectory()) {
      output += `${indent}[DIR] ${relativePath}/\n`;
      output += listDirectoryContents(fullPath, indent + '  ');
    } else {
      output += `${indent}[FILE] ${relativePath} (${stats.size} bytes)\n`;
    }
  });
  
  return output;
}

// AFTER the special routes, serve static files
app.use(express.static(DIST_DIR));

// FINALLY, the catch-all route for SPA routing (this should be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Job Management Microfrontend Server                      ║
║                                                            ║
║   Server running at:                                       ║
║   - http://localhost:${PORT}                               ║
║                                                            ║
║   RemoteEntry URL:                                         ║
║   - http://localhost:${PORT}/remoteEntry.js                ║
║                                                            ║
║   Diagnostic Tools:                                        ║
║   - http://localhost:${PORT}/test-remote                   ║
║   - http://localhost:${PORT}/list-dir                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});