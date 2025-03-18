// File: packages/config-editor/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the absolute path of the current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'configEditor',
      filename: 'remoteEntry.js',
      exposes: {
        './ConfigEditor': './src/ConfigEditor.tsx',
      },
      shared: [
        'react', 
        'react-dom', 
        '@mui/material', 
        'react-router-dom', 
        'axios', 
        'js-yaml', 
        '@monaco-editor/react'
      ]
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Add an alias for the shared package
      'shared': path.resolve(__dirname, '../shared/dist')
    },
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3001,
    strictPort: true,
    cors: true,
    // Ensure all file types are handled correctly
    fs: {
      allow: ['..']
    },
    // Important: The path to remoteEntry.js should be accessible
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  preview: {
    port: 3001,
    strictPort: true,
    // These options help ensure the remoteEntry.js is accessible
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  // Use the right mode to ensure proper environment variables
  mode: process.env.NODE_ENV || 'development'
});