// File: packages/config-selector/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'configSelector',
      filename: 'remoteEntry.js',
      exposes: {
        './ConfigManager': './src/ConfigManager.tsx',
      },
      remotes: {
        yamlEditor: 'http://localhost:3002/assets/remoteEntry.js'
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
    modulePreload: false
  },
  server: {
    port: 3003,
    strictPort: true
  },
  preview: {
    port: 3003,
    strictPort: true
  }
});
