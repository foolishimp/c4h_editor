/**
 * /packages/shell/vite.config.ts
 * Vite configuration for the shell application
 * --- UPDATED: Removed serveSharedPlugin ---
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname functionality in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Removed serveSharedPlugin function ---

export default defineConfig({
  plugins: [
    react()
    // serveSharedPlugin() // <-- REMOVED
  ],
  // configureServer hook removed
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022'
    },
    include: ['shared'] // Keep this alias target if shell imports shared directly
  },
  esbuild: {
    target: 'es2022'
  },
  build: { // Build config for shell app itself
    target: 'esnext',
    minify: false,
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
      'shared': path.resolve(__dirname, '../shared/src') 
    }
  },
  // server/preview port config removed
  server: {
    cors: true
  },
  preview: {
    cors: true
  }
});