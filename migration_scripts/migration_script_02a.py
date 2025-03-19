#!/usr/bin/env python3
# migration_script_2a.py
#
# This script creates the initial ConfigSelector microfrontend structure:
# 1. Creates package directory structure
# 2. Sets up package.json, tsconfig.json, and other config files
# 3. Adds the main ConfigManager component and Context

import os
import json
from pathlib import Path

BASE_DIR = Path("c4h-micro")

def create_directory(path):
    if not path.exists():
        print(f"Creating directory: {path}")
        path.mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)

def setup_config_selector_package_structure():
    # Create directory structure
    config_selector_dir = BASE_DIR / "packages" / "config-selector"
    create_directory(config_selector_dir)
    create_directory(config_selector_dir / "src")
    create_directory(config_selector_dir / "src" / "components")
    create_directory(config_selector_dir / "src" / "hooks")
    create_directory(config_selector_dir / "src" / "contexts")
    create_directory(config_selector_dir / "src" / "utils")
    
    # Create package.json
    package_json = {
        "name": "config-selector",
        "private": True,
        "version": "0.1.0",
        "type": "module",
        "scripts": {
            "start": "vite --port 3003 --strictPort",
            "build": "tsc && vite build",
            "preview": "vite preview --port 3003 --strictPort"
        },
        "dependencies": {
            "@emotion/react": "^11.11.4",
            "@emotion/styled": "^11.11.0",
            "@mui/icons-material": "^5.15.14",
            "@mui/material": "^5.15.14",
            "axios": "^1.6.7",
            "js-yaml": "^4.1.0",
            "react": "^18.3.1",
            "react-dom": "^18.3.1",
            "react-router-dom": "^6.22.3",
            "date-fns": "^3.6.0",
            "shared": "*"
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
    
    write_file(config_selector_dir / "package.json", json.dumps(package_json, indent=2))
    
    # Create tsconfig.json
    tsconfig_json = {
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
        "references": [
            {
                "path": "./tsconfig.node.json"
            }
        ]
    }
    
    write_file(config_selector_dir / "tsconfig.json", json.dumps(tsconfig_json, indent=2))
    
    # Create tsconfig.node.json
    tsconfig_node_json = {
        "compilerOptions": {
            "composite": True,
            "skipLibCheck": True,
            "module": "ESNext",
            "moduleResolution": "bundler",
            "allowSyntheticDefaultImports": True
        },
        "include": ["vite.config.ts"]
    }
    
    write_file(config_selector_dir / "tsconfig.node.json", json.dumps(tsconfig_node_json, indent=2))
    
    # Create vite.config.ts
    vite_config = """// File: packages/config-selector/vite.config.ts
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
        './ConfigManager': './src/ConfigManager.tsx',
      },
      remotes: {
        yamlEditor: 'http://localhost:3002/assets/remoteEntry.js'
      },
      shared: ['react', 'react-dom', 'shared']
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    },
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    modulePreload: false
  },
  server: {
    port: 3003,
    strictPort: true
  },
  preview: {
    port: 3003,
    strictPort: true
  }
});
"""
    
    write_file(config_selector_dir / "vite.config.ts", vite_config)
    
    # Create index.html
    index_html = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Config Selector</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""
    
    write_file(config_selector_dir / "index.html", index_html)
    
    # Create ConfigManager.tsx - Main exported component
    config_manager = """// File: packages/config-selector/src/ConfigManager.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { ConfigProvider } from './contexts/ConfigContext';
import ConfigList from './components/ConfigList';
import ConfigEditor from './components/ConfigEditor';
import { configTypes } from 'shared';

interface ConfigManagerProps {
  configType?: string;
}

const ConfigManager: React.FC<ConfigManagerProps> = ({ configType: propConfigType }) => {
  const { configType: paramConfigType, id } = useParams<{ configType?: string, id?: string }>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use the config type from props or URL params
  const configType = propConfigType || paramConfigType;
  
  if (!configType) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          No configuration type specified
        </Typography>
        <Typography variant="body1">
          Please specify a configuration type to manage.
        </Typography>
      </Box>
    );
  }
  
  // Check if the config type is valid
  if (!configTypes[configType]) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          Invalid configuration type: {configType}
        </Typography>
        <Typography variant="body1">
          The specified configuration type is not supported.
        </Typography>
      </Box>
    );
  }
  
  return (
    <ConfigProvider configType={configType}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {configTypes[configType].name} Management
        </Typography>
        
        {id ? (
          <ConfigEditor configId={id} />
        ) : (
          <ConfigList />
        )}
      </Box>
    </ConfigProvider>
  );
};

export default ConfigManager;
"""
    
    write_file(config_selector_dir / "src" / "ConfigManager.tsx", config_manager)
    
    # Create main.tsx for standalone development
    main_tsx = """// File: packages/config-selector/src/main.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, Container, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import ConfigManager from './ConfigManager';
import { configTypes } from 'shared';

// Simple demo app for standalone development
const App = () => {
  const [selectedConfigType, setSelectedConfigType] = useState<string>('workorder');

  return (
    <BrowserRouter>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ mb: 4 }}>
          <h1>Config Selector Demo</h1>
          <p>This is a standalone demo of the Config Selector component.</p>
          
          <FormControl fullWidth sx={{ mb: 4 }}>
            <InputLabel id="config-type-label">Configuration Type</InputLabel>
            <Select
              labelId="config-type-label"
              value={selectedConfigType}
              label="Configuration Type"
              onChange={(e) => setSelectedConfigType(e.target.value)}
            >
              {Object.entries(configTypes).map(([key, config]) => (
                <MenuItem key={key} value={key}>{config.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        <Routes>
          <Route path="/" element={<ConfigManager configType={selectedConfigType} />} />
          <Route path="/:configType" element={<ConfigManager />} />
          <Route path="/:configType/:id" element={<ConfigManager />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
"""
    
    write_file(config_selector_dir / "src" / "main.tsx", main_tsx)
    
    print("ConfigSelector package structure and main components created!")

if __name__ == "__main__":
    setup_config_selector_package_structure()