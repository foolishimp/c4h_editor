/// <reference path="../shared/src/types/federation.d.ts" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Removed: import { systemjs } from 'vite-plugin-systemjs';
import path from 'path';

export default defineConfig({
  plugins: [
    react()
    // Removed: systemjs()
  ],
  optimizeDeps: {
      esbuildOptions: {
          target: 'es2022'
      }
      // Note: The 'target', 'minify', etc. were correctly moved out in the previous step.
  },
  esbuild: {
    target: 'es2022'
  },
  build: {
    target: 'esnext', // Or es2022
    minify: false,
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
      // Keep the alias correction from previous step or adjust as needed
      'shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    cors: true
  },
  preview: {
    port: 3000,
    strictPort: true,
    cors: true
  }
});