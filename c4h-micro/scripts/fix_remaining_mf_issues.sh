#!/bin/bash
# fix_remaining_mf_issues.sh
# Script to fix the remaining Module Federation issues in the C4H Editor microfrontends

set -e
echo "Starting C4H Editor Microfrontend Configuration Fix (Round 2)..."
ROOT_DIR=$(pwd)
PACKAGES_DIR="$ROOT_DIR/packages"

# 1. Fix shared package - it doesn't need Module Federation since it's a library
echo "Fixing shared package..."
cat > "$PACKAGES_DIR/shared/README.md" << 'EOF'
# Shared Package

This is a shared library package that doesn't need Module Federation configuration.
It is built with TypeScript and consumed by other packages.
EOF

# 2. Fix microfrontend exposing components
echo "Fixing component exposures in microfrontends..."

# Fix config-editor package
echo "Configuring config-editor exports..."
cat > "$PACKAGES_DIR/config-editor/vite.config.ts" << 'EOF'
// packages/config-editor/vite.config.ts
/// <reference path="../shared/src/types/federation.d.ts" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'configEditor',
      filename: 'remoteEntry.js',
      exposes: {
        './ConfigEditor': './src/ConfigEditor.tsx'
      },
      shared: {
        react: { 
          singleton: true,
          requiredVersion: '^18.0.0'
        },
        'react-dom': { 
          singleton: true,
          requiredVersion: '^18.0.0'
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^5.0.0'
        }
      }
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
  }
});
EOF

# Create postbuild script for copying remoteEntry.js to dist root
cat > "$PACKAGES_DIR/config-editor/postbuild.js" << 'EOF'
const fs = require('fs');
const path = require('path');

// Copy remoteEntry.js from assets to dist root
const assetsDir = path.resolve(__dirname, 'dist/assets');
const distDir = path.resolve(__dirname, 'dist');
const remoteEntryPath = path.join(assetsDir, 'remoteEntry.js');
const targetPath = path.join(distDir, 'remoteEntry.js');

if (fs.existsSync(remoteEntryPath)) {
  console.log('Copying remoteEntry.js from assets to dist root...');
  fs.copyFileSync(remoteEntryPath, targetPath);
  console.log('✅ remoteEntry.js copied successfully');
} else {
  console.error('❌ remoteEntry.js not found in assets directory');
}
EOF

# Update package.json for config-editor to include postbuild script
jq '.scripts.postbuild = "node postbuild.js"' \
  "$PACKAGES_DIR/config-editor/package.json" > temp.json && mv temp.json "$PACKAGES_DIR/config-editor/package.json"

# Fix yaml-editor package
echo "Configuring yaml-editor exports..."
cat > "$PACKAGES_DIR/yaml-editor/vite.config.ts" << 'EOF'
// packages/yaml-editor/vite.config.ts
/// <reference path="../shared/src/types/federation.d.ts" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'yamlEditor',
      filename: 'remoteEntry.js',
      exposes: {
        './YamlEditor': './src/YamlEditor.tsx'
      },
      shared: {
        react: { 
          singleton: true,
          requiredVersion: '^18.0.0'
        },
        'react-dom': { 
          singleton: true,
          requiredVersion: '^18.0.0'
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^5.0.0'
        }
      }
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
  }
});
EOF

# Create postbuild script for yaml-editor
cp "$PACKAGES_DIR/config-editor/postbuild.js" "$PACKAGES_DIR/yaml-editor/postbuild.js"

# Update package.json for yaml-editor
jq '.scripts.postbuild = "node postbuild.js"' \
  "$PACKAGES_DIR/yaml-editor/package.json" > temp.json && mv temp.json "$PACKAGES_DIR/yaml-editor/package.json"

# Fix job-management package
echo "Configuring job-management exports..."
cat > "$PACKAGES_DIR/job-management/vite.config.ts" << 'EOF'
// packages/job-management/vite.config.ts
/// <reference path="../shared/src/types/federation.d.ts" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'jobManagement',
      filename: 'remoteEntry.js',
      exposes: {
        './JobManager': './src/JobManager.tsx'
      },
      shared: {
        react: { 
          singleton: true,
          requiredVersion: '^18.0.0'
        },
        'react-dom': { 
          singleton: true,
          requiredVersion: '^18.0.0'
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^5.0.0'
        },
        '@mui/icons-material': {
          singleton: true,
          requiredVersion: '^5.0.0'
        }
      }
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
  }
});
EOF

# Create postbuild script for job-management
cp "$PACKAGES_DIR/config-editor/postbuild.js" "$PACKAGES_DIR/job-management/postbuild.js"

# Update package.json for job-management
jq '.scripts.postbuild = "node postbuild.js"' \
  "$PACKAGES_DIR/job-management/package.json" > temp.json && mv temp.json "$PACKAGES_DIR/job-management/package.json"

# Fix config-selector package
echo "Configuring config-selector exports..."
cat > "$PACKAGES_DIR/config-selector/vite.config.ts" << 'EOF'
// packages/config-selector/vite.config.ts
/// <reference path="../shared/src/types/federation.d.ts" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'configSelector',
      filename: 'remoteEntry.js',
      exposes: {
        './ConfigManager': './src/ConfigManager.tsx'
      },
      shared: {
        react: { 
          singleton: true,
          requiredVersion: '^18.0.0'
        },
        'react-dom': { 
          singleton: true,
          requiredVersion: '^18.0.0'
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^5.0.0'
        }
      }
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
  }
});
EOF

# Create postbuild script for config-selector
cp "$PACKAGES_DIR/config-editor/postbuild.js" "$PACKAGES_DIR/config-selector/postbuild.js"

# Update package.json for config-selector
jq '.scripts.postbuild = "node postbuild.js"' \
  "$PACKAGES_DIR/config-selector/package.json" > temp.json && mv temp.json "$PACKAGES_DIR/config-selector/package.json"

# 3. Update shell package to reference all microfrontends
echo "Updating shell package to reference all microfrontends..."
cat > "$PACKAGES_DIR/shell/vite.config.ts" << 'EOF'
// packages/shell/vite.config.ts
/// <reference path="../shared/src/types/federation.d.ts" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        configEditor: 'http://localhost:3001/assets/remoteEntry.js',
        yamlEditor: 'http://localhost:3002/assets/remoteEntry.js',
        configSelector: 'http://localhost:3003/assets/remoteEntry.js',
        jobManagement: 'http://localhost:3004/assets/remoteEntry.js'
      },
      shared: {
        react: { 
          singleton: true,
          requiredVersion: '^18.0.0'
        },
        'react-dom': { 
          singleton: true,
          requiredVersion: '^18.0.0'
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^5.0.0'
        },
        '@mui/icons-material': {
          singleton: true,
          requiredVersion: '^5.0.0'
        }
      }
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
  }
});
EOF

# 4. Create build scripts for root package.json
echo "Creating build scripts in root package.json..."
jq '.scripts."build:all" = "npm run build:shared && npm run build:remotes && npm run build:shell" | 
    .scripts."build:shared" = "cd packages/shared && npm run build" |
    .scripts."build:remotes" = "npm run build:config-editor && npm run build:yaml-editor && npm run build:config-selector && npm run build:job-management" |
    .scripts."build:config-editor" = "cd packages/config-editor && npm run build && npm run postbuild" |
    .scripts."build:yaml-editor" = "cd packages/yaml-editor && npm run build && npm run postbuild" |
    .scripts."build:config-selector" = "cd packages/config-selector && npm run build && npm run postbuild" |
    .scripts."build:job-management" = "cd packages/job-management && npm run build && npm run postbuild" |
    .scripts."build:shell" = "cd packages/shell && npm run build" |
    .scripts."start:all" = "concurrently \"cd packages/config-editor && npm run preview\" \"cd packages/yaml-editor && n