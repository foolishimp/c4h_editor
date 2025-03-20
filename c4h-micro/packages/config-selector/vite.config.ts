// File: packages/config-selector/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  // Empty base for proper path resolution
  base: '',
  plugins: [
    react(),
    federation({
      name: 'configSelector',
      filename: 'remoteEntry.js',
      exposes: {
        './ConfigManager': './src/ConfigManager.tsx',
      },
      remotes: {
        // Simple string format - more reliable in this case since we're having issues
        yamlEditor: 'http://localhost:3002/remoteEntry.js'
      },
      shared: {
        // Simple shared config - matches the working YAML editor
        react: {
          eager: true
        } as any,
        'react-dom': {
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
    outDir: 'dist',
    rollupOptions: {
      // Match the working YAML editor configuration
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
    cors: true,
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