// File: packages/shell/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the absolute path of the current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        configEditor: 'http://localhost:3001/remoteEntry.js'
      },
      shared: [
        'react', 
        'react-dom', 
        '@mui/material', 
        'react-router-dom', 
        'axios', 
        'js-yaml'
      ]
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Add an alias for the shared package
      'shared': path.resolve(__dirname, '../shared/dist')
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    },
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    },
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    sourcemap: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material']
  },
  // Use the right mode to ensure proper environment variables
  mode: process.env.NODE_ENV || 'development'
});