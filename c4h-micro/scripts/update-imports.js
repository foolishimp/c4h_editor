// File: scripts/update-imports.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to search for
const patterns = [
  {
    find: /import.*from ['"]\.\.\/config\/api['"]/g,
    replace: `import { api, API_ENDPOINTS } from 'shared'`
  },
  {
    find: /import.*from ['"]\.\.\/hooks\/useJobApi['"]/g,
    replace: `import { apiService } from 'shared'`
  },
  {
    find: /import.*from ['"]\.\.\/hooks\/useWorkOrderApi['"]/g,
    replace: `import { apiService } from 'shared'`
  },
  {
    find: /import.*TimeAgo.*from ['"]\.\.\/common\/TimeAgo['"]/g,
    replace: `import { TimeAgo } from 'shared'`
  },
  {
    find: /import.*TimeAgo.*from ['"]\.\.\/components\/TimeAgo['"]/g,
    replace: `import { TimeAgo } from 'shared'`
  },
  {
    find: /import.*DiffViewer.*from ['"]\.\.\/common\/DiffViewer['"]/g,
    replace: `import { DiffViewer } from 'shared'`
  },
  {
    find: /import.*RemoteComponent.*from ['"]\.\.\/utils\/RemoteComponent['"]/g,
    replace: `import { RemoteComponent } from 'shared'`
  }
];

// Directories to scan
const packageDirs = [
  'packages/shell/src/**/*.{ts,tsx}',
  'packages/config-editor/src/**/*.{ts,tsx}',
  'packages/config-selector/src/**/*.{ts,tsx}',
  'packages/job-management/src/**/*.{ts,tsx}',
  'packages/yaml-editor/src/**/*.{ts,tsx}'
];

// Function to update file content
function updateFile(filePath) {
  console.log(`Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  patterns.forEach(pattern => {
    if (pattern.find.test(content)) {
      content = content.replace(pattern.find, pattern.replace);
      updated = true;
    }
  });

  if (updated) {
    console.log(`Updated imports in ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

// Main function to process all files
async function main() {
  try {
    for (const dirPattern of packageDirs) {
      const files = glob.sync(dirPattern, { nodir: true });
      console.log(`Found ${files.length} files in ${dirPattern}`);
      
      files.forEach(file => {
        updateFile(file);
      });
    }
    
    console.log('Import paths updated successfully.');
  } catch (error) {
    console.error('Error updating import paths:', error);
  }
}

main();