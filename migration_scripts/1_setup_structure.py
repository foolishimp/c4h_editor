#!/usr/bin/env python3
# File: 1_setup_structure.py
# 
# This script creates the initial project structure for the C4H Editor microfrontend architecture.
# It sets up directories and creates essential configuration files.

import os
import json
import shutil
import subprocess
import sys
from pathlib import Path

# Configuration
PROJECT_ROOT = "c4h-editor-micro"
SOURCE_FRONTEND = "../frontend"  # Path to the existing frontend code

def check_prerequisites():
    """Check if required tools are installed"""
    try:
        # Check if Node.js is installed
        node_version = subprocess.run(["node", "--version"], capture_output=True, text=True)
        print(f"Found Node.js: {node_version.stdout.strip()}")
        
        # Check if npm is installed
        npm_version = subprocess.run(["npm", "--version"], capture_output=True, text=True)
        print(f"Found npm: {npm_version.stdout.strip()}")
        
        # Check if git is installed
        git_version = subprocess.run(["git", "--version"], capture_output=True, text=True)
        print(f"Found git: {git_version.stdout.strip()}")
        
        # Check if source frontend exists
        if not os.path.exists(SOURCE_FRONTEND):
            print(f"Error: Source frontend directory '{SOURCE_FRONTEND}' does not exist.")
            return False
            
        return True
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please make sure Node.js, npm, and git are installed.")
        return False

def create_project_structure():
    """Create the base project directory structure"""
    print("\nCreating project structure...")
    
    # Create root directory
    if os.path.exists(PROJECT_ROOT):
        print(f"Project directory '{PROJECT_ROOT}' already exists.")
        overwrite = input("Do you want to overwrite it? (y/n): ").lower() == 'y'
        if overwrite:
            shutil.rmtree(PROJECT_ROOT)
        else:
            print("Aborting setup.")
            sys.exit(1)
    
    # Create package directories
    packages = ["shell", "config-editor", "shared"]
    for package in packages:
        package_path = os.path.join(PROJECT_ROOT, "packages", package, "src")
        os.makedirs(package_path, exist_ok=True)
        print(f"Created {package_path}")
    
    # Create additional directories
    directories = [
        os.path.join(PROJECT_ROOT, "packages", "shared", "src", "types"),
        os.path.join(PROJECT_ROOT, "packages", "shared", "src", "utils"),
        os.path.join(PROJECT_ROOT, "packages", "shared", "src", "components"),
        os.path.join(PROJECT_ROOT, "packages", "shared", "src", "config"),
        os.path.join(PROJECT_ROOT, "packages", "shell", "src", "components"),
        os.path.join(PROJECT_ROOT, "packages", "shell", "src", "components", "common"),
        os.path.join(PROJECT_ROOT, "packages", "shell", "src", "components", "WorkOrderList"),
        os.path.join(PROJECT_ROOT, "packages", "shell", "src", "components", "JobsList"),
        os.path.join(PROJECT_ROOT, "packages", "shell", "src", "components", "JobDetails"),
        os.path.join(PROJECT_ROOT, "packages", "shell", "src", "config"),
        os.path.join(PROJECT_ROOT, "packages", "config-editor", "src", "components"),
        os.path.join(PROJECT_ROOT, "packages", "config-editor", "src", "contexts"),
        os.path.join(PROJECT_ROOT, "packages", "config-editor", "src", "hooks"),
        os.path.join(PROJECT_ROOT, "packages", "config-editor", "src", "config"),
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Created {directory}")

def create_package_files():
    """Create package.json files for the project"""
    print("\nCreating package configuration files...")
    
    # Root package.json
    root_package = {
        "name": "c4h-editor",
        "private": True,
        "workspaces": [
            "packages/*"
        ],
        "scripts": {
            "start": "concurrently \"npm run start:shell\" \"npm run start:config-editor\"",
            "start:shell": "npm run start -w packages/shell",
            "start:config-editor": "npm run start -w packages/config-editor",
            "build": "npm run build:shared && npm run build:config-editor && npm run build:shell",
            "build:shared": "npm run build -w packages/shared",
            "build:shell": "npm run build -w packages/shell",
            "build:config-editor": "npm run build -w packages/config-editor"
        },
        "devDependencies": {
            "concurrently": "^8.2.2",
            "typescript": "^5.3.3"
        }
    }
    
    with open(os.path.join(PROJECT_ROOT, "package.json"), "w") as f:
        json.dump(root_package, f, indent=2)
    
    # Shell package.json
    shell_package = {
        "name": "shell",
        "private": True,
        "version": "0.1.0",
        "type": "module",
        "scripts": {
            "start": "vite",
            "build": "tsc && vite build",
            "preview": "vite preview"
        },
        "dependencies": {
            "@emotion/react": "^11.11.4",
            "@emotion/styled": "^11.11.0",
            "@mui/icons-material": "^5.15.14",
            "@mui/material": "^5.15.14",
            "axios": "^1.6.7",
            "react": "^18.3.1",
            "react-dom": "^18.3.1",
            "react-router-dom": "^6.22.3",
            "date-fns": "^3.6.0"
        },
        "devDependencies": {
            "@originjs/vite-plugin-federation": "^1.3.5",
            "@types/react": "^18.2.61",
            "@types/react-dom": "^18.2.19",
            "@vitejs/plugin-react": "^4.3.4",
            "typescript": "^5.3.3",
            "vite": "^5.4.14"
        }
    }
    
    with open(os.path.join(PROJECT_ROOT, "packages", "shell", "package.json"), "w") as f:
        json.dump(shell_package, f, indent=2)
    
    # Config Editor package.json
    config_editor_package = {
        "name": "config-editor",
        "private": True,
        "version": "0.1.0",
        "type": "module",
        "scripts": {
            "start": "vite --port 3001",
            "build": "tsc && vite build",
            "preview": "vite preview --port 3001"
        },
        "dependencies": {
            "@emotion/react": "^11.11.4",
            "@emotion/styled": "^11.11.0",
            "@monaco-editor/react": "^4.6.0",
            "@mui/icons-material": "^5.15.14",
            "@mui/material": "^5.15.14",
            "axios": "^1.6.7",
            "js-yaml": "^4.1.0",
            "monaco-editor": "^0.47.0",
            "react": "^18.3.1",
            "react-dom": "^18.3.1",
            "date-fns": "^3.6.0"
        },
        "devDependencies": {
            "@originjs/vite-plugin-federation": "^1.3.5",
            "@types/js-yaml": "^4.0.9",
            "@types/react": "^18.2.61",
            "@types/react-dom": "^18.2.19",
            "@vitejs/plugin-react": "^4.3.4",
            "typescript": "^5.3.3",
            "vite": "^5.4.14"
        }
    }
    
    with open(os.path.join(PROJECT_ROOT, "packages", "config-editor", "package.json"), "w") as f:
        json.dump(config_editor_package, f, indent=2)
    
    # Shared package.json
    shared_package = {
        "name": "shared",
        "private": True,
        "version": "0.1.0",
        "type": "module",
        "main": "dist/index.js",
        "types": "dist/index.d.ts",
        "scripts": {
            "build": "tsc"
        },
        "dependencies": {
            "axios": "^1.6.7",
            "date-fns": "^3.6.0",
            "diff": "^5.2.0"
        },
        "devDependencies": {
            "@types/diff": "^5.0.8",
            "typescript": "^5.3.3"
        },
        "peerDependencies": {
            "react": "^18.3.1",
            "react-dom": "^18.3.1",
            "@mui/material": "^5.15.14"
        }
    }
    
    with open(os.path.join(PROJECT_ROOT, "packages", "shared", "package.json"), "w") as f:
        json.dump(shared_package, f, indent=2)

def create_vite_configs():
    """Create Vite configuration files"""
    print("\nCreating Vite configuration files...")
    
    # Shell vite.config.ts
    shell_vite_config = """// File: packages/shell/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        configEditor: 'http://localhost:3001/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom', '@mui/material', 'axios']
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  }
});
"""
    
    with open(os.path.join(PROJECT_ROOT, "packages", "shell", "vite.config.ts"), "w") as f:
        f.write(shell_vite_config)
    
    # Config Editor vite.config.ts
    config_editor_vite_config = """// File: packages/config-editor/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'configEditor',
      filename: 'remoteEntry.js',
      exposes: {
        './ConfigEditor': './src/ConfigEditor.tsx',
      },
      shared: ['react', 'react-dom', '@mui/material', 'axios', 'js-yaml', '@monaco-editor/react']
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  }
});
"""
    
    with open(os.path.join(PROJECT_ROOT, "packages", "config-editor", "vite.config.ts"), "w") as f:
        f.write(config_editor_vite_config)

def create_ts_configs():
    """Create TypeScript configuration files"""
    print("\nCreating TypeScript configuration files...")
    
    # Shell tsconfig.json
    shell_tsconfig = {
        "compilerOptions": {
            "target": "ES2020",
            "useDefineForClassFields": True,
            "lib": ["ES2020", "DOM", "DOM.Iterable"],
            "module": "ESNext",
            "skipLibCheck": True,
            "moduleResolution": "bundler",
            "allowImportingTsExtensions": True,
            "resolveJsonModule": True,
            "isolatedModules": True,
            "noEmit": True,
            "jsx": "react-jsx",
            "strict": True,
            "noImplicitAny": True,
            "noUnusedLocals": True,
            "noUnusedParameters": True,
            "noFallthroughCasesInSwitch": True,
            "allowSyntheticDefaultImports": True,
            "esModuleInterop": True,
            "baseUrl": ".",
            "paths": {
                "@/*": ["./src/*"]
            }
        },
        "include": ["src", "../../global.d.ts"],
        "references": [{ "path": "./tsconfig.node.json" }]
    }
    
    with open(os.path.join(PROJECT_ROOT, "packages", "shell", "tsconfig.json"), "w") as f:
        json.dump(shell_tsconfig, f, indent=2)
    
    # Shell tsconfig.node.json
    shell_tsconfig_node = {
        "compilerOptions": {
            "composite": True,
            "skipLibCheck": True,
            "module": "ESNext",
            "moduleResolution": "bundler",
            "allowSyntheticDefaultImports": True
        },
        "include": ["vite.config.ts"]
    }
    
    with open(os.path.join(PROJECT_ROOT, "packages", "shell", "tsconfig.node.json"), "w") as f:
        json.dump(shell_tsconfig_node, f, indent=2)
    
    # Config Editor tsconfig.json
    config_editor_tsconfig = {
        "compilerOptions": {
            "target": "ES2020",
            "useDefineForClassFields": True,
            "lib": ["ES2020", "DOM", "DOM.Iterable"],
            "module": "ESNext",
            "skipLibCheck": True,
            "moduleResolution": "bundler",
            "allowImportingTsExtensions": True,
            "resolveJsonModule": True,
            "isolatedModules": True,
            "noEmit": True,
            "jsx": "react-jsx",
            "strict": True,
            "noImplicitAny": True,
            "noUnusedLocals": True,
            "noUnusedParameters": True,
            "noFallthroughCasesInSwitch": True,
            "allowSyntheticDefaultImports": True,
            "esModuleInterop": True,
            "baseUrl": ".",
            "paths": {
                "@/*": ["./src/*"]
            }
        },
        "include": ["src", "../../global.d.ts"],
        "references": [{ "path": "./tsconfig.node.json" }]
    }
    
    with open(os.path.join(PROJECT_ROOT, "packages", "config-editor", "tsconfig.json"), "w") as f:
        json.dump(config_editor_tsconfig, f, indent=2)
    
    # Config Editor tsconfig.node.json
    config_editor_tsconfig_node = {
        "compilerOptions": {
            "composite": True,
            "skipLibCheck": True,
            "module": "ESNext",
            "moduleResolution": "bundler",
            "allowSyntheticDefaultImports": True
        },
        "include": ["vite.config.ts"]
    }
    
    with open(os.path.join(PROJECT_ROOT, "packages", "config-editor", "tsconfig.node.json"), "w") as f:
        json.dump(config_editor_tsconfig_node, f, indent=2)
    
    # Shared tsconfig.json
    shared_tsconfig = {
        "compilerOptions": {
            "target": "ES2020",
            "useDefineForClassFields": True,
            "lib": ["ES2020", "DOM", "DOM.Iterable"],
            "module": "ESNext",
            "moduleResolution": "node",
            "declaration": True,
            "outDir": "./dist",
            "jsx": "react-jsx",
            "strict": True,
            "noImplicitAny": True,
            "skipLibCheck": True,
            "esModuleInterop": True,
            "allowSyntheticDefaultImports": True
        },
        "include": ["src"],
        "exclude": ["node_modules", "dist"]
    }
    
    with open(os.path.join(PROJECT_ROOT, "packages", "shared", "tsconfig.json"), "w") as f:
        json.dump(shared_tsconfig, f, indent=2)

def create_global_dts():
    """Create global.d.ts for module resolution"""
    print("\nCreating global.d.ts...")
    
    global_d_ts = """// File: global.d.ts
declare module 'configEditor/ConfigEditor';
"""
    
    with open(os.path.join(PROJECT_ROOT, "global.d.ts"), "w") as f:
        f.write(global_d_ts)

def create_readme():
    """Create README.md for the project"""
    print("\nCreating README.md...")
    
    readme_content = """# C4H Editor Microfrontend Architecture

## Overview

This is a microfrontend implementation of the C4H Editor, which allows users to:
- Create, edit, and manage WorkOrders
- Submit WorkOrders as Jobs
- Track Job status and view results
- Edit configurations via YAML using Monaco Editor

## Project Structure

```
c4h-editor/
├── packages/
│   ├── shell/                # Main container application
│   ├── config-editor/        # WorkOrder editor microfrontend
│   └── shared/               # Shared utilities, types, and components
└── package.json              # Root package.json for workspaces
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v8+)

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

This will start both the shell application (port 3000) and the config-editor microfrontend (port 3001).

### Building for Production

To build the entire application:

```
npm run build
```

## Technology Stack

- **Module Federation**: Webpack 5 (with Vite plugin)
- **Build System**: Vite
- **Frontend Framework**: React 18
- **UI Components**: Material UI
- **Editor**: Monaco Editor
- **State Management**: React Context + Event Bus
- **HTTP Client**: Axios
- **TypeScript**: TypeScript 5.3+

## Architecture

The application is built using a microfrontend architecture with Webpack Module Federation:

1. **Shell Application**: Main container, routing, authentication
2. **Config Editor**: WorkOrder editor microfrontend
3. **Shared Package**: Common types, utilities, and components

Cross-microfrontend communication is handled by a combination of:
- React Context for local state
- Custom Event Bus for cross-microfrontend events
- Shared types and utilities
"""
    
    with open(os.path.join(PROJECT_ROOT, "README.md"), "w") as f:
        f.write(readme_content)
    
    print(f"Created README.md at {os.path.join(PROJECT_ROOT, 'README.md')}")

def create_next_steps_file():
    """Create next-steps.txt with instructions for running other scripts"""
    next_steps = """# Next Steps for C4H Editor Migration

Now that the basic project structure is set up, you need to run the following scripts in order:

1. Run the script to set up shared package:
   ```
   python 2_setup_shared.py
   ```

2. Run the script to set up the config-editor microfrontend:
   ```
   python 3_setup_config_editor.py
   ```

3. Run the script to set up the shell application:
   ```
   python 4_setup_shell.py
   ```

4. Install dependencies and start the application:
   ```
   cd c4h-editor
   npm install
   npm start
   ```

After completing these steps, you should have a fully functional microfrontend architecture.
"""

    with open(os.path.join(PROJECT_ROOT, "next-steps.txt"), "w") as f:
        f.write(next_steps)
    
    print(f"Created next-steps.txt at {os.path.join(PROJECT_ROOT, 'next-steps.txt')}")

# Main function
if __name__ == "__main__":
    print("C4H Editor Migration - Step 1: Project Structure Setup")
    print("=====================================================")
    
    # Check prerequisites
    if not check_prerequisites():
        sys.exit(1)
    
    # Create project structure
    create_project_structure()
    
    # Create configuration files
    create_package_files()
    create_vite_configs()
    create_ts_configs()
    create_global_dts()
    
    # Create README
    create_readme()
    
    # Create next steps file
    create_next_steps_file()
    
    print("\nStep 1 Complete! Project structure created.")
    print(f"Project location: {os.path.abspath(PROJECT_ROOT)}")
    print("\nPlease check next-steps.txt for instructions on running the remaining scripts.")