// File: packages/shell/vite.config.ts
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
        // Ensure React is properly shared - must match between host and remotes
        react: { 
          singleton: true,
          strictVersion: true,
          requiredVersion: '^18.0.0',
          eager: true
        },
        'react-dom': { 
          singleton: true,
          strictVersion: true,
          requiredVersion: '^18.0.0',
          eager: true
        },
        // Remove jsx-runtime reference that's causing issues
        '@mui/material': {
          singleton: true,
          requiredVersion: '^5.0.0'
        },
        '@mui/icons-material': {
          singleton: true,
          requiredVersion: '^5.0.0'
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.0.0'
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
    sourcemap: true,
    outDir: 'dist',
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].[hash].js'
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  },
  preview: {
    port: 3000,
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  },
  // Fix global access in Vite build
  define: {
    'process.env': {},
    'global': 'window'
  },
  // Ensure React resolution is consistent
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', '@mui/icons-material', 'react-router-dom'],
    exclude: ['shared']
  }
});