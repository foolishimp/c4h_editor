// File: packages/shell/vite.config.ts
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
        yamlEditor: 'http://localhost:3002/assets/remoteEntry.js',
        configSelector: 'http://localhost:3003/assets/remoteEntry.js',
        jobManagement: 'http://localhost:3004/assets/remoteEntry.js'
      },
      shared: {
        react: { singleton: true, requiredVersion: '*', eager: true },
        'react-dom': { singleton: true, requiredVersion: '*', eager: true },
        '@mui/material': { singleton: true, requiredVersion: '^5.0.0', eager: true },
        '@mui/icons-material': { singleton: true, requiredVersion: '^5.0.0', eager: true },
        'shared': {
            singleton: true,
            eager: true
        }
      }
    })
  ],
  optimizeDeps: {
      esbuildOptions: {
          target: 'es2022'
      }
  },
  esbuild: {
    target: 'es2022'
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
        output: {
            format: 'esm',
            entryFileNames: 'assets/[name].js',
            chunkFileNames: 'assets/[name].js',
            assetFileNames: 'assets/[name].[ext]'
        }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // --- CORRECTED ALIAS ---
      // Point to the root of the shared package, not its src directory
      'shared': path.resolve(__dirname, '../shared')
      // --- END CORRECTION ---
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