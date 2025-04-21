import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    lib: {
      entry: './src/main.tsx',
      formats: ['es'],
      fileName: (format) => 'yaml-editor.js'
    },
    rollupOptions: {
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
    strictPort: true,
    cors: true
  },
  preview: {
    strictPort: true,
    cors: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), 
      'shared': path.resolve(__dirname, '../shared/dist/build')
    }
  }
});