#!/usr/bin/env node
// File: c4h-micro/analyze-remote-entry.js
/**
 * A script to analyze a remoteEntry.js file to determine its structure
 */
const fs = require('fs');
const path = require('path');

// Check if a file path was provided
if (process.argv.length < 3) {
  console.error('Please provide the path to remoteEntry.js');
  console.error('Usage: node analyze-remote-entry.js <path-to-remote-entry.js>');
  process.exit(1);
}

const filePath = process.argv[2];

// Check if the file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Read the file
const content = fs.readFileSync(filePath, 'utf8');

// Log file info
console.log(`\nAnalyzing: ${filePath}`);
console.log(`File size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB\n`);

// Check for key federation signatures
const analysis = {
  type: 'unknown',
  esModule: false,
  webpackFederation: false,
  viteFederation: false,
  exposedModules: [],
  hasInit: false,
  hasGet: false,
  globalRegistration: false
};

// Check if it's an ES module
if (content.includes('export {') || content.includes('export default')) {
  analysis.esModule = true;
}

// Check for webpack federation signature
if (content.includes('__webpack_require__') || content.includes('__webpack_exports__')) {
  analysis.webpackFederation = true;
  analysis.type = 'webpack';
}

// Check for Vite federation signature
if (content.includes('__federation_import') || content.includes('dynamicLoadingCss')) {
  analysis.viteFederation = true;
  analysis.type = 'vite';
}

// Check for init method
if (content.includes('function init') || content.includes('const init')) {
  analysis.hasInit = true;
}

// Check for get method 
if (content.includes('function get') || content.includes('const get')) {
  analysis.hasGet = true;
}

// Check if it registers itself globally
if (content.includes('window[') || content.includes('globalThis[')) {
  analysis.globalRegistration = true;
}

// Extract exposed modules
const moduleMapRegex = /moduleMap\s*=\s*{([^}]*)}/;
const exposesRegex = /exposes\s*:\s*{([^}]*)}/;

if (moduleMapRegex.test(content)) {
  const moduleMap = content.match(moduleMapRegex)[1];
  const moduleEntries = moduleMap.match(/"([^"]+)"/g);
  
  if (moduleEntries) {
    analysis.exposedModules = moduleEntries.map(m => m.replace(/"/g, ''));
  }
}

if (exposesRegex.test(content)) {
  const exposes = content.match(exposesRegex)[1];
  const moduleEntries = exposes.match(/"([^"]+)"/g);
  
  if (moduleEntries) {
    analysis.exposedModules = analysis.exposedModules.concat(
      moduleEntries.map(m => m.replace(/"/g, ''))
    );
  }
}

// Print analysis
console.log('FEDERATION ANALYSIS:');
console.log('===================');
console.log(`Federation Type: ${analysis.type}`);
console.log(`ES Module: ${analysis.esModule ? 'Yes' : 'No'}`);
console.log(`Webpack Federation: ${analysis.webpackFederation ? 'Yes' : 'No'}`);
console.log(`Vite Federation: ${analysis.viteFederation ? 'Yes' : 'No'}`);
console.log(`Has 'init' method: ${analysis.hasInit ? 'Yes' : 'No'}`);
console.log(`Has 'get' method: ${analysis.hasGet ? 'Yes' : 'No'}`);
console.log(`Global registration: ${analysis.globalRegistration ? 'Yes' : 'No'}`);

console.log('\nEXPOSED MODULES:');
console.log('================');
if (analysis.exposedModules.length > 0) {
  analysis.exposedModules.forEach(m => console.log(`- ${m}`));
} else {
  console.log('No exposed modules found');
}

// Extract export statements
console.log('\nEXPORTS:');
console.log('========');
const exportRegex = /export\s+(?:{([^}]+)}|default|const|function)/g;
const exports = [];
let match;

while ((match = exportRegex.exec(content)) !== null) {
  if (match[1]) {
    exports.push(...match[1].split(',').map(e => e.trim()));
  } else if (match[0].includes('default')) {
    exports.push('default');
  } else {
    const functionMatch = content.substring(match.index).match(/export\s+(const|function)\s+(\w+)/);
    if (functionMatch) {
      exports.push(functionMatch[2]);
    }
  }
}

if (exports.length > 0) {
  exports.forEach(e => console.log(`- ${e}`));
} else {
  console.log('No explicit exports found');
}

// Check for potential issues
console.log('\nPOTENTIAL ISSUES:');
console.log('================');

const issues = [];

if (analysis.esModule && !analysis.hasGet) {
  issues.push('ES Module without get method - will not work with standard federation');
}

if (analysis.esModule && !analysis.hasInit) {
  issues.push('ES Module without init method - might not initialize shared dependencies');
}

if (!analysis.esModule && !analysis.globalRegistration) {
  issues.push('Not an ES Module and does not register globally - container might not be accessible');
}

if (analysis.exposedModules.length === 0) {
  issues.push('No exposed modules found - nothing to import');
}

if (issues.length > 0) {
  issues.forEach(issue => console.log(`- ⚠️ ${issue}`));
} else {
  console.log('No issues detected');
}

// Recommended fix
console.log('\nRECOMMENDED FIX:');
console.log('===============');

if (analysis.type === 'vite') {
  console.log(`
For Vite Federation, ensure your shell loads it like this:

import * as ${analysis.exposedModules[0]?.split('/')[0] || 'remoteName'} from "${path.basename(filePath)}";
const Component = await (await ${analysis.exposedModules[0]?.split('/')[0] || 'remoteName'}.get("${analysis.exposedModules[0] || './Component'}"))();
  `);
} else if (analysis.type === 'webpack') {
  console.log(`
For Webpack Federation, ensure your shell loads it like this:

const container = window.${analysis.exposedModules[0]?.split('/')[0] || 'remoteName'};
await container.init({react: {...}});
const factory = await container.get("${analysis.exposedModules[0] || './Component'}");
const Component = await factory();
  `);
} else {
  console.log(`
Unable to determine exact fix. Try both approaches:

1. Direct import (Vite style):
   import * as remote from "${path.basename(filePath)}";
   const factory = await remote.get("./YourModule");
   const Component = await factory();

2. Global registration (Webpack style):
   // The script will register a global variable
   const container = window.yourContainerName;
   await container.init({...});
   const factory = await container.get("./YourModule");
   const Component = await factory();
  `);
}