// File: c4h-micro/packages/job-management/vite.config.ts
/// <reference path="../shared/src/types/federation.d.ts" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  base: '',
  plugins: [
    react(),
    federation({
      name: 'jobManagement',
      filename: 'remoteEntry.js', // Changed to plain filename
      exposes: {
        './JobManager': './src/JobManager.tsx',
      },
      shared: {
        react: { 
          singleton: true,
          requiredVersion: '^18.0.0',
          eager: true
        },
        'react-dom': { 
          singleton: true,
          requiredVersion: '^18.0.0',
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
        }
      }
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
    modulePreload: false,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        format: 'esm',
        entryFileNames: '[name].js', // Removed assets/ prefix
        chunkFileNames: '[name].js', // Removed assets/ prefix
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    outDir: 'dist'
  },
  server: {
    port: 3004,
    strictPort: true,
    cors: true,
    hmr: {
      timeout: 5000
    },
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  },
  preview: {
    port: 3004,
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  },
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});