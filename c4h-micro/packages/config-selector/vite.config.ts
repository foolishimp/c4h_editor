import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    lib: {
      entry: './src/main.tsx',
      formats: ['es'], // ESM format for direct browser import
      name: 'ConfigSelector', // Global name (if used in UMD/IIFE)
      fileName: (format) => 'config-selector.js'
    },
    rollupOptions: {
      // Make sure your shell loads only what it needs
      external: [
        'react',
        'react-dom',
        '@mui/material', 
        '@mui/icons-material',
        'shared'
      ],
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
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
      'shared': path.resolve(__dirname, '../shared/src')
    }
  }
});