// File: packages/job-management/vite.config.ts
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
        './JobManager': './src/JobManager.tsx',
      },
      shared: {
        react: { 
          singleton: true, 
          requiredVersion: '*',  // Change from '^18.0.0' to '*'
          eager: true
        },
        'react-dom': { 
          singleton: true, 
          requiredVersion: '*',  // Change from '^18.0.0' to '*'
          eager: true
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^5.0.0',
          eager: true
        },
        '@mui/icons-material': {
          singleton: true,
          requiredVersion: '^5.0.0',
          eager: true
        },
        'shared': {
          singleton: true,
          eager: true
        }
      }
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'esm',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js'
      }
    }
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