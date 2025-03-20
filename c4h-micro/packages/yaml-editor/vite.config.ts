/// <reference path="../shared/src/types/federation.d.ts" />

// File: c4h-micro/packages/yaml-editor/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  base: '',
  plugins: [
    react(),
    federation({
      name: 'yamlEditor',
      filename: 'remoteEntry.js', // Changed to plain filename
      exposes: {
        './YamlEditor': './src/YamlEditor.tsx',
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
        '@monaco-editor/react': { 
          singleton: true,
          requiredVersion: '^4.5.0',
          eager: false
        },
        'monaco-editor': {
          singleton: true,
          eager: false
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^5.0.0',
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
    port: 3002,
    strictPort: true,
    cors: true,
    hmr: {
      timeout: 5000
    }
  },
  preview: {
    port: 3002,
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