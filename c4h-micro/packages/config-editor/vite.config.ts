// File: packages/config-editor/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'configEditor',
      filename: 'remoteEntry.js',
      exposes: {
        './ConfigEditor': './src/ConfigEditor.tsx',
      },
      shared: ['react', 'react-dom']
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
    // Make sure modulePreload is false for Module Federation
    modulePreload: false
  },
  server: {
    port: 3001,
    strictPort: true
  },
  preview: {
    port: 3001,
    strictPort: true
  }
});