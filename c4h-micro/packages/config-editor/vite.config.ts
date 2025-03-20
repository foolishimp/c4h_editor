// File: packages/config-editor/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  // Add empty base for proper path resolution
  base: '',
  plugins: [
    react(),
    federation({
      name: 'configEditor',
      filename: 'remoteEntry.js',
      exposes: {
        './ConfigEditor': './src/ConfigEditor.tsx',
      },
      shared: {
        react: { 
          requiredVersion: '^18.0.0',
          eager: true 
        } as any, 
        'react-dom': { 
          requiredVersion: '^18.0.0',
          eager: true 
        } as any
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
    assetsDir: '',
    rollupOptions: {
      output: {
        format: 'esm',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      }
    }
  },
  server: {
    port: 3001,
    strictPort: true,
    hmr: {
      timeout: 5000
    },
    cors: true
  },
  preview: {
    port: 3001,
    strictPort: true,
    cors: true 
  }
});