// File: c4h-micro/packages/job-management/server.cjs
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3004;

// Enhanced CORS middleware - MUST be before any routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Set correct content type for JS files
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  
  next();
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Special handler for remoteEntry.js
app.get('/remoteEntry.js', (req, res) => {
  const remoteEntryPath = path.join(__dirname, 'dist', 'remoteEntry.js');
  const assetsFallbackPath = path.join(__dirname, 'dist', 'assets', 'remoteEntry.js');
  
  console.log(`Requested remoteEntry.js, checking paths...`);
  
  if (fs.existsSync(remoteEntryPath)) {
    console.log(`Sending remoteEntry.js from: ${remoteEntryPath}`);
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(remoteEntryPath);
  } else if (fs.existsSync(assetsFallbackPath)) {
    console.log(`Sending remoteEntry.js from assets directory: ${assetsFallbackPath}`);
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(assetsFallbackPath);
  } else {
    console.error('remoteEntry.js not found in any expected location');
    // Search for it anywhere in the dist directory
    let foundPath = null;
    const findRemoteEntry = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          findRemoteEntry(filePath);
        } else if (file === 'remoteEntry.js') {
          foundPath = filePath;
          return;
        }
      }
    };
    
    try {
      findRemoteEntry(path.join(__dirname, 'dist'));
      if (foundPath) {
        console.log(`Found remoteEntry.js at: ${foundPath}`);
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(foundPath);
      } else {
        res.status(404).send('remoteEntry.js not found. Make sure to build the project first.');
      }
    } catch (err) {
      console.error('Error searching for remoteEntry.js:', err);
      res.status(500).send('Server error while looking for remoteEntry.js');
    }
  }
});

// Copy remoteEntry.js to root level if it only exists in assets
const ensureRemoteEntryAtRoot = () => {
  const sourceFile = path.join(__dirname, 'dist', 'assets', 'remoteEntry.js');
  const targetFile = path.join(__dirname, 'dist', 'remoteEntry.js');
  
  if (fs.existsSync(sourceFile) && !fs.existsSync(targetFile)) {
    try {
      fs.copyFileSync(sourceFile, targetFile);
      console.log('✅ Copied remoteEntry.js from assets to root level');
    } catch (err) {
      console.error('Failed to copy remoteEntry.js to root level:', err);
    }
  }
};

// Handle all other requests with the index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Ensure the dist directory exists before starting server
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  console.error('❌ Dist directory not found! Run "npm run build" first.');
  process.exit(1);
}

// Make sure remoteEntry.js is at root level
ensureRemoteEntryAtRoot();

// Start the server
app.listen(PORT, () => {
  console.log(`JobManagement micro frontend server is running at http://localhost:${PORT}`);
  console.log(`remoteEntry.js is available at http://localhost:${PORT}/remoteEntry.js`);
  
  // Check if the server is actually serving the file
  const http = require('http');
  http.get(`http://localhost:${PORT}/remoteEntry.js`, (res) => {
    console.log(`✅ remoteEntry.js is accessible with status: ${res.statusCode}`);
    console.log(`✅ Content-Type: ${res.headers['content-type']}`);
  }).on('error', (err) => {
    console.error(`❌ Error accessing remoteEntry.js: ${err.message}`);
  });
});