// File: packages/shell/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        configEditor: {
          external: 'http://localhost:3001/remoteEntry.js',
          externalType: 'url',
        },
        yamlEditor: {
          external: 'http://localhost:3002/remoteEntry.js',
          externalType: 'url',
        },
        configSelector: {
          external: 'http://localhost:3003/remoteEntry.js',
          externalType: 'url',
        },
        jobManagement: {
          external: 'http://localhost:3004/remoteEntry.js',
          externalType: 'url',
        }
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
    modulePreload: false
  },
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      timeout: 5000
    }
  },
  optimizeDeps: {
    force: true
  }
});