/// <reference path="../shared/src/types/federation.d.ts" />

// File: c4h-micro/packages/config-selector/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  base: '',
  plugins: [
    react(),
    federation({
      name: 'configSelector',
      filename: 'remoteEntry.js', // Changed to plain filename
      exposes: {
        './ConfigManager': './src/ConfigManager.tsx',
      },
      remotes: {
        yamlEditor: 'http://localhost:3002/remoteEntry.js' // Updated to match
      },
      shared: {
        react: { 
          singleton: true,
          requiredVersion: '^18.0.0',
          eager: false
        },
        'react-dom': { 
          singleton: true,
          requiredVersion: '^18.0.0',
          eager: true 
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^5.0.0',
          eager: false
        },
        '@mui/icons-material': {
          singleton: true,
          requiredVersion: '^5.0.0',
          eager: false
        },
        'js-yaml': {
          singleton: true,
          requiredVersion: '^4.0.0',
          eager: false
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
    }
  },
  server: {
    port: 3003,
    strictPort: true,
    cors: true,
    hmr: {
      timeout: 5000
    }
  },
  preview: {
    port: 3003,
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});