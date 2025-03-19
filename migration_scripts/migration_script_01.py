#!/usr/bin/env python3
# migration_script_1.py
#
# This script sets up the YamlEditor microfrontend by:
# 1. Creating the yaml-editor package structure
# 2. Extracting the YAMLEditor component from config-editor
# 3. Setting up the Module Federation configuration

import os
import json
import shutil
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

def setup_yaml_editor_package():
    # Create directory structure
    yaml_editor_dir = BASE_DIR / "packages" / "yaml-editor"
    create_directory(yaml_editor_dir)
    create_directory(yaml_editor_dir / "src")
    create_directory(yaml_editor_dir / "src" / "components")
    
    # Create package.json
    package_json = {
        "name": "yaml-editor",
        "private": True,
        "version": "0.1.0",
        "type": "module",
        "scripts": {
            "start": "vite --port 3002 --strictPort",
            "build": "tsc && vite build",
            "preview": "vite preview --port 3002 --strictPort"
        },
        "dependencies": {
            "@emotion/react": "^11.11.4",
            "@emotion/styled": "^11.11.0",
            "@monaco-editor/react": "^4.6.0",
            "@mui/icons-material": "^5.15.14",
            "@mui/material": "^5.15.14",
            "js-yaml": "^4.1.0",
            "monaco-editor": "^0.47.0",
            "react": "^18.3.1",
            "react-dom": "^18.3.1",
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
    
    write_file(yaml_editor_dir / "package.json", json.dumps(package_json, indent=2))
    
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
    
    write_file(yaml_editor_dir / "tsconfig.json", json.dumps(tsconfig_json, indent=2))
    
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
    
    write_file(yaml_editor_dir / "tsconfig.node.json", json.dumps(tsconfig_node_json, indent=2))
    
    # Create vite.config.ts
    vite_config = """// File: packages/yaml-editor/vite.config.ts
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
        './YamlEditor': './src/YamlEditor.tsx',
      },
      shared: ['react', 'react-dom', 'monaco-editor', '@monaco-editor/react']
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
    port: 3002,
    strictPort: true
  },
  preview: {
    port: 3002,
    strictPort: true
  }
});
"""
    
    write_file(yaml_editor_dir / "vite.config.ts", vite_config)
    
    # Create index.html
    index_html = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>YAML Editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""
    
    write_file(yaml_editor_dir / "index.html", index_html)
    
    # Copy YAMLEditor.tsx from config-editor
    yaml_editor_src = BASE_DIR / "packages" / "config-editor" / "src" / "components" / "YAMLEditor.tsx"
    yaml_editor_dst = yaml_editor_dir / "src" / "YamlEditor.tsx"
    
    # Read the original file content
    with open(yaml_editor_src, "r") as file:
        yaml_editor_content = file.read()
        
    # Modify for standalone microfrontend
    modified_content = """// File: packages/yaml-editor/src/YamlEditor.tsx
import React, { useRef } from 'react';
import { Box, Button, Paper, Typography, Alert } from '@mui/material';
import Editor from '@monaco-editor/react';

interface YamlEditorProps {
  yaml: string;
  onChange: (yaml: string) => void;
  onSave: () => Promise<void>;
  readOnly?: boolean;
  title?: string;
  description?: string;
}

const YamlEditor: React.FC<YamlEditorProps> = ({ 
  yaml, 
  onChange,
  onSave,
  readOnly = false,
  title = "YAML Editor",
  description = "Edit the configuration in YAML format. Changes will only be applied when you save."
}) => {
  // Editor reference
  const editorRef = useRef<any>(null);
  
  // Function to handle editor mount
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };
  
  // Handle YAML content changes in the editor
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };
  
  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      
      <Box 
        sx={{ 
          height: '500px', 
          border: 1, 
          borderColor: 'grey.300', 
          borderRadius: 1, 
          mb: 2,
          overflow: 'hidden' 
        }}
      >
        <Editor
          height="100%"
          defaultLanguage="yaml"
          value={yaml}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            folding: true,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: readOnly
          }}
        />
      </Box>
      
      {!readOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Alert severity="info" sx={{ mr: 2, flexGrow: 1 }}>
            This editor modifies the configuration directly in YAML. 
            Make sure your YAML is valid before saving.
          </Alert>
          <Button 
            variant="contained" 
            onClick={onSave}
            disabled={!yaml}
          >
            Save Changes
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default YamlEditor;
"""
    
    write_file(yaml_editor_dst, modified_content)
    
    # Create main.tsx for standalone development
    main_tsx = """// File: packages/yaml-editor/src/main.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, Container, Box } from '@mui/material';
import YamlEditor from './YamlEditor';

// Simple demo app for standalone development
const App = () => {
  const [yaml, setYaml] = useState(`# Example YAML
name: example-config
version: 1.0.0
description: Example configuration
settings:
  enabled: true
  timeout: 30
  features:
    - feature1
    - feature2
`);

  const handleSave = async () => {
    console.log('Saving YAML:', yaml);
    // In standalone mode, just log the YAML
    return Promise.resolve();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <h1>YAML Editor Demo</h1>
        <p>This is a standalone demo of the YAML Editor component.</p>
      </Box>
      <YamlEditor 
        yaml={yaml} 
        onChange={setYaml} 
        onSave={handleSave}
        title="Demo YAML Editor"
        description="Edit this example YAML to test the editor functionality."
      />
    </Container>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);
"""
    
    write_file(yaml_editor_dir / "src" / "main.tsx", main_tsx)
    
    # Update the root package.json to include yaml-editor
    root_package_json_path = BASE_DIR / "package.json"
    with open(root_package_json_path, "r") as file:
        root_package_json = json.load(file)
    
    # Add scripts for yaml-editor
    if "scripts" in root_package_json:
        root_package_json["scripts"]["start:yaml-editor"] = "npm run start -w packages/yaml-editor"
        root_package_json["scripts"]["build:yaml-editor"] = "npm run build -w packages/yaml-editor"
        
        # Update start script to include yaml-editor
        start_script = root_package_json["scripts"]["start"]
        if "yaml-editor" not in start_script:
            root_package_json["scripts"]["start"] = 'concurrently -n "yaml-editor,config-editor,shell" -c "yellow,blue,green" "npm run start:yaml-editor" "npm run start:config-editor" "wait-on http://localhost:3001 http://localhost:3002 && npm run start:shell"'
        
        # Update build script
        build_script = root_package_json["scripts"]["build"]
        if "yaml-editor" not in build_script:
            root_package_json["scripts"]["build"] = "npm run build:shared && npm run build:yaml-editor && npm run build:config-editor && npm run build:shell"
    
    write_file(root_package_json_path, json.dumps(root_package_json, indent=2))
    
    # Update global.d.ts to include YamlEditor
    global_d_ts_path = BASE_DIR / "global.d.ts"
    with open(global_d_ts_path, "r") as file:
        global_d_ts_content = file.read()
    
    if "yamlEditor/YamlEditor" not in global_d_ts_content:
        updated_global_d_ts = global_d_ts_content.strip() + "\ndeclare module 'yamlEditor/YamlEditor';\n"
        write_file(global_d_ts_path, updated_global_d_ts)
    
    print("YamlEditor microfrontend setup completed!")

if __name__ == "__main__":
    setup_yaml_editor_package()