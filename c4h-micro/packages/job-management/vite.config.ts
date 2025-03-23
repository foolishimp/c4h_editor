// File: /packages/job-management/vite.config.ts
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
  },
  server: {
    port: 3004,
    strictPort: true,  // This ensures the server fails if port is in use
    cors: true         // Required for Module Federation
  },
  preview: {
    port: 3004,
    strictPort: true,
    cors: true
  }
});