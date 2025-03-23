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
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        '@mui/material': { singleton: true, requiredVersion: '^5.0.0' },
        '@mui/icons-material': { singleton: true, requiredVersion: '^5.0.0' }
      }
    })
  ],
  build: {
    modulePreload: false,  // Important for Vite federation
    target: 'esnext',      // Required for proper federation
    minify: false,         // Helpful for debugging
    cssCodeSplit: false    // Prevents CSS splitting issues
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    }
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
  }
});