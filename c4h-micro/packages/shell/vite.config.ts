/**
 * /packages/shell/vite.config.ts
 * Vite configuration for the shell application
 * --- UPDATED: Exclude 'shared' from optimizeDeps ---
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname functionality in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react()
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022' // Or your desired target
    },
    // Force Vite to not pre-bundle 'shared'.
    // This means the browser will resolve it directly at runtime.
    exclude: ['shared'],
    // Keep include alias target if shell imports shared directly - maybe redundant if excluded? Test needed.
    // include: ['shared']
  },
  esbuild: {
    target: 'es2022' // Match target
  },
  build: { // Build config for shell app itself
    target: 'esnext', // Use esnext for modern features if targeting modern browsers
    minify: false, // Keep false for easier debugging if needed
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Alias for shell's internal use during dev/build
      // This remains important so import 'shared' works in shell source code
      'shared': path.resolve(__dirname, '../shared/src') // Point to source for dev
      // If using built version directly:
      // 'shared': path.resolve(__dirname, '../shared/dist/build')
    }
  },
  server: {
    // Ensure server can resolve the shared package correctly, especially with exclude
    fs: {
      // Allow serving files from one level up to include the shared package source/dist
      allow: ['..']
    },
    cors: true // Keep CORS enabled
  },
  preview: {
    cors: true // Keep CORS enabled
  }
});