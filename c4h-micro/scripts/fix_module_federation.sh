#!/bin/bash
# fix_module_federation.sh
# Script to fix Module Federation issues in the C4H Editor microfrontends

set -e
echo "Starting C4H Editor Microfrontend Configuration Fix..."
ROOT_DIR=$(pwd)
PACKAGES_DIR="$ROOT_DIR/packages"

# 1. Update root package.json to ensure shared dependencies
echo "Updating root package.json..."
jq '.devDependencies."@originjs/vite-plugin-federation" = "^1.3.5" | 
    .devDependencies."vite" = "^5.4.14" | 
    .devDependencies."@vitejs/plugin-react" = "^4.3.4"' \
    package.json > temp.json && mv temp.json package.json

# 2. Create federation.d.ts file if needed
FEDERATION_TYPES_DIR="$PACKAGES_DIR/shared/src/types"
mkdir -p "$FEDERATION_TYPES_DIR"
cat > "$FEDERATION_TYPES_DIR/federation.d.ts" << 'EOF'
// packages/shared/src/types/federation.d.ts
declare module '@originjs/vite-plugin-federation' {
  export default function federation(options: FederationOptions): any;
  
  export interface FederationOptions {
    name?: string;
    filename?: string;
    exposes?: Record<string, string>;
    remotes?: Record<string, string>;
    shared?: Record<string, SharedConfig | boolean>;
  }
  
  export interface SharedConfig {
    singleton?: boolean;
    eager?: boolean;
    requiredVersion?: string;
    strictVersion?: boolean;
    version?: string;
  }
}
EOF

# 3. Update each package configuration
echo "Updating microfrontend packages..."

# Function to generate a postbuild script for a package
create_postbuild_script() {
  local package_dir="$1"
  cat > "$package_dir/postbuild.js" << 'EOF'
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
}

# Update config-editor package
echo "Configuring config-editor..."
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
    cssCodeSplit: false,
    outDir: 'dist'
  },
  server: {
    port: 3001,
    strictPort: true,
    cors: true
  },
  preview: {
    port: 3001,
    strictPort: true,
    cors: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
  }
});
EOF

jq '.dependencies."@originjs/vite-plugin-federation" = "^1.3.5" | .scripts.postbuild = "node postbuild.js"' \
  "$PACKAGES_DIR/config-editor/package.json" > temp.json && mv temp.json "$PACKAGES_DIR/config-editor/package.json"
create_postbuild_script "$PACKAGES_DIR/config-editor"

# Update yaml-editor package
echo "Configuring yaml-editor..."
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
        },
        'monaco-editor': {
          singleton: true
        }
      }
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    outDir: 'dist'
  },
  server: {
    port: 3002,
    strictPort: true,
    cors: true
  },
  preview: {
    port: 3002,
    strictPort: true,
    cors: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
  }
});
EOF

jq '.dependencies."@originjs/vite-plugin-federation" = "^1.3.5" | .scripts.postbuild = "node postbuild.js"' \
  "$PACKAGES_DIR/yaml-editor/package.json" > temp.json && mv temp.json "$PACKAGES_DIR/yaml-editor/package.json"
create_postbuild_script "$PACKAGES_DIR/yaml-editor"

# Update config-selector package
echo "Configuring config-selector..."
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
    cssCodeSplit: false,
    outDir: 'dist'
  },
  server: {
    port: 3003,
    strictPort: true,
    cors: true
  },
  preview: {
    port: 3003,
    strictPort: true,
    cors: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
  }
});
EOF

jq '.dependencies."@originjs/vite-plugin-federation" = "^1.3.5" | .scripts.postbuild = "node postbuild.js"' \
  "$PACKAGES_DIR/config-selector/package.json" > temp.json && mv temp.json "$PACKAGES_DIR/config-selector/package.json"
create_postbuild_script "$PACKAGES_DIR/config-selector"

# Update job-management package
echo "Configuring job-management..."
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
    cssCodeSplit: false,
    outDir: 'dist'
  },
  server: {
    port: 3004,
    strictPort: true,
    cors: true
  },
  preview: {
    port: 3004,
    strictPort: true,
    cors: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
  }
});
EOF

jq '.dependencies."@originjs/vite-plugin-federation" = "^1.3.5" | .dependencies."vite" = "^5.4.14" | .scripts.postbuild = "node postbuild.js"' \
  "$PACKAGES_DIR/job-management/package.json" > temp.json && mv temp.json "$PACKAGES_DIR/job-management/package.json"
create_postbuild_script "$PACKAGES_DIR/job-management"

# Update shell package
echo "Configuring shell..."
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
  server: {
    port: 3000,
    strictPort: true,
    cors: true
  },
  preview: {
    port: 3000,
    strictPort: true,
    cors: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
  }
});
EOF

jq '.dependencies."@originjs/vite-plugin-federation" = "^1.3.5" | .dependencies."vite" = "^5.4.14"' \
  "$PACKAGES_DIR/shell/package.json" > temp.json && mv temp.json "$PACKAGES_DIR/shell/package.json"

# Update shared package.json to include the right dependencies
echo "Configuring shared package..."
jq '.dependencies."react" = "^18.3.1" | .dependencies."react-dom" = "^18.3.1" | .devDependencies."vite" = "^5.4.14" | .devDependencies."@originjs/vite-plugin-federation" = "^1.3.5"' \
  "$PACKAGES_DIR/shared/package.json" > temp.json && mv temp.json "$PACKAGES_DIR/shared/package.json"

# 4. Create convenient scripts in root package.json for better workflow
echo "Creating convenient scripts in root package.json..."
jq '.scripts."build:all" = "npm run build:shared && npm run build:remotes && npm run build:shell" | 
    .scripts."build:shared" = "cd packages/shared && npm run build" |
    .scripts."build:remotes" = "concurrently \"cd packages/config-editor && npm run build && npm run postbuild\" \"cd packages/yaml-editor && npm run build && npm run postbuild\" \"cd packages/config-selector && npm run build && npm run postbuild\" \"cd packages/job-management && npm run build && npm run postbuild\"" |
    .scripts."build:shell" = "cd packages/shell && npm run build" |
    .scripts."preview:all" = "concurrently \"cd packages/config-editor && npm run preview\" \"cd packages/yaml-editor && npm run preview\" \"cd packages/config-selector && npm run preview\" \"cd packages/job-management && npm run preview\" \"cd packages/shell && npm run preview\"" |
    .scripts."dev:shell" = "cd packages/shell && npm run start"' \
    package.json > temp.json && mv temp.json package.json

# Add concurrently as a dev dependency to simplify running multiple commands
jq '.devDependencies."concurrently" = "^8.2.0"' \
    package.json > temp.json && mv temp.json package.json

# 5. Install dependencies
echo "Installing dependencies..."
npm install

echo "
==============================================================
✅ Module Federation Configuration Complete!

To run the application:
1. Build all microfrontends: 
   npm run build:all

2. Preview all microfrontends and the shell: 
   npm run preview:all

3. Or for development, run the shell in dev mode with remotes in preview:
   npm run build:remotes
   npm run preview:all
   npm run dev:shell (in a separate terminal)
==============================================================
"