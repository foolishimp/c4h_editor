/**
 * /packages/job-management/vite.config.ts
 * Vite configuration for job-management microfrontend
 * --- UPDATED: Added missing externals ---
 * --- UPDATED: Removed server/preview port config ---
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    // Changed target to esnext for consistency
    target: 'esnext', // Was es2020
    minify: false,
    cssCodeSplit: false,
    lib: {
      entry: './src/main.tsx', // Entry point for job-management
      formats: ['es'],
      fileName: () => 'job-management.js' // Output filename
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime', // Added
        '@mui/material',
        '@mui/icons-material',
        '@emotion/react',   // Added
        '@emotion/styled',  // Added
        'shared'
        // Add 'axios', 'date-fns', 'react-router-dom' if they should be external/shared
      ],
      output: {
        format: 'esm',
        entryFileNames: 'assets/job-management.js', // Use specific name
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  // Removed server/preview sections
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/src')
    }
    // Removed dedupe array
  }
});