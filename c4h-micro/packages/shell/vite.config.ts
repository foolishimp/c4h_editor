// File: packages/shell/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  base: '',  // Add this line to ensure correct base path
  plugins: [
    react(),
    federation({
      name: 'shell',
      // Simplified remotes format - this is the key change
      remotes: {
        configEditor: "http://localhost:3001/remoteEntry.js",
        yamlEditor: "http://localhost:3002/remoteEntry.js",
        configSelector: "http://localhost:3003/remoteEntry.js",
        jobManagement: "http://localhost:3004/remoteEntry.js"
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
    modulePreload: false,
    assetsDir: '',  // Add this to ensure correct path
  },
  server: {
    port: 3000,
    strictPort: true,
    cors: true,  // Add CORS support
    hmr: {
      timeout: 5000
    }
  },
  optimizeDeps: {
    force: true
  }
});