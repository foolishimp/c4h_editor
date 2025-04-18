/// <reference path="../shared/src/types/federation.d.ts" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    lib: {
      entry: './src/main.tsx',
      name: 'configSelectorApp',
      formats: ['system'],
      fileName: () => 'config-selector.js'
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'single-spa',
        'single-spa-react',
        'single-spa-react',
        '@mui/material',
        '@mui/icons-material',
        'shared'
      ],
    },
    target: 'esnext',
    minify: false,
  },
  server: {
    port: 3003,
    strictPort: true,
    cors: true
  },
  preview: {
    port: 3003,
    strictPort: true,
    cors: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist'),
      'yaml-editor': path.resolve(__dirname, '../yaml-editor/src')
    }
  }
});