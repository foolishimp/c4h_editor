// File: c4h-micro/packages/shell/vite.config.ts
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
      name: 'shell',
      remotes: {
        configEditor: 'http://localhost:3001/remoteEntry.js',
        yamlEditor: 'http://localhost:3002/remoteEntry.js',
        configSelector: 'http://localhost:3003/remoteEntry.js',
        jobManagement: 'http://localhost:3004/remoteEntry.js'
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
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    cors: true,
    hmr: {
      timeout: 5000
    }
  },
  preview: {
    port: 3000,
    strictPort: true,
    cors: true
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