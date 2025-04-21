/**
 * /packages/shell/vite.config.ts
 * Vite configuration for the shell application
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react()
  ], 
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022'
    },
    include: ['shared']
  },
  esbuild: {
    target: 'es2022'
  },
  build: {
    target: 'esnext',
    minify: false, // Disable minification for better debugging
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/src')
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    cors: true,
    headers: {
      // Add headers to allow proper CORS for loading microfrontends
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  },
  preview: {
    port: 3000,
    strictPort: true,
    cors: true
  }
});