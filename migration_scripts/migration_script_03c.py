#!/usr/bin/env python3
# migration_script_03c.py
#
# This script creates the Vite config and index.html for the JobManagement microfrontend

import os
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

def create_vite_and_html_files():
    job_management_dir = BASE_DIR / "packages" / "job-management"
    
    # Create vite.config.ts
    vite_config = """// File: packages/job-management/vite.config.ts
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
        './JobManager': './src/JobManager.tsx',
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
    port: 3004,
    strictPort: true
  },
  preview: {
    port: 3004,
    strictPort: true
  }
});
"""
    
    write_file(job_management_dir / "vite.config.ts", vite_config)
    
    # Create index.html
    index_html = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Job Management</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""
    
    write_file(job_management_dir / "index.html", index_html)
    
    print("JobManagement vite.config.ts and index.html created successfully!")

if __name__ == "__main__":
    create_vite_and_html_files()