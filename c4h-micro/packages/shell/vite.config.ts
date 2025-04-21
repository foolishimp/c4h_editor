/**
 * /packages/shell/vite.config.ts
 * Vite configuration for the shell application
 * --- UPDATED: Removed server/preview port config ---
 * --- UPDATED: Removed resolve.dedupe ---
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// import shellPlugin from './shell-vite.plugin'; // Uncomment if you use this plugin

export default defineConfig({
  plugins: [
    react(),
    // shellPlugin() // Uncomment if you use this plugin
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
    // Shell builds an application, not a library
    target: 'esnext',
    minify: false,
    cssCodeSplit: false, // Keep CSS bundled for simplicity
    rollupOptions: {
      output: {
        format: 'esm', // Standard format
        // Standard output naming for shell app assets
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Ensure alias points to the source directory of the shared package
      'shared': path.resolve(__dirname, '../shared/src')
    }
    // Removed dedupe array
  },
  // Removed server and preview sections defining port/strictPort
  // CORS can be kept if direct access during dev is needed, otherwise remove
  server: {
    cors: true
  },
  preview: {
    cors: true
  }
});