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
        // Ensure React is properly shared - must be eager to prevent multiple instances
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
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks: undefined,
      },
      // Ensure external dependencies are handled correctly
      external: []
    },
    // This ensures remoteEntry.js is placed in the dist root
    assetsDir: 'assets'
  },
  server: {
    port: 3004,
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/javascript"
    }
  },
  preview: {
    port: 3004,
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