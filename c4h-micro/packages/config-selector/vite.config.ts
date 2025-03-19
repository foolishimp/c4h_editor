// File: packages/config-selector/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  // ADD THIS LINE HERE (1) ↓
  base: '',  // Empty string means the root path
  
  plugins: [
    react(),
    federation({
      name: 'configSelector',
      filename: 'remoteEntry.js',  // This is already correct
      exposes: {
        './ConfigManager': './src/ConfigManager.tsx',
      },
      remotes: {
        yamlEditor: 'http://localhost:3002/remoteEntry.js'
      },
      shared: ['react', 'react-dom', 'shared']
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
    // ADD THIS LINE HERE (2) ↓
    assetsDir: '',  // This ensures assets aren't in a subdirectory
    
    rollupOptions: {
      output: {
        format: 'esm',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      }
    }
  },
  server: {
    port: 3003,
    strictPort: true,
    hmr: {
      timeout: 5000
    }
  },
  preview: {
    port: 3003,
    strictPort: true,
    cors: true
  }
});