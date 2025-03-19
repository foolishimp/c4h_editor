// File: packages/yaml-editor/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'yamlEditor',
      filename: 'remoteEntry.js',
      exposes: {
        './YamlEditor': './src/YamlEditor.tsx',
      },
      shared: ['react', 'react-dom', 'monaco-editor', '@monaco-editor/react']
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
    port: 3002,
    strictPort: true
  },
  preview: {
    port: 3002,
    strictPort: true
  }
});
