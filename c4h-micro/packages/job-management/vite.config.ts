// Removed federation reference path

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    target: 'es2020',
    minify: false,
    cssCodeSplit: false,
    lib: {
      entry: './src/main.tsx',
      formats: ['es'],
      fileName: (format) => 'job-management.js'
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'single-spa', 'single-spa-react', '@mui/material', '@mui/icons-material', 'shared'],
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
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