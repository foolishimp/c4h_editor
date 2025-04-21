/**
 * /packages/test-app/vite.config.ts
 * Vite configuration for test-app microfrontend
 * --- UPDATED: Standardized externals ---
 * --- UPDATED: Removed server/preview port config ---
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    lib: {
      entry: './src/main.tsx', // Entry point for test-app
      formats: ['es'],
      fileName: () => 'test-app.js' // Output filename
    },
    rollupOptions: {
      // Consistent list of externals (even if not all used by this specific MFE)
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@mui/material',
        '@mui/icons-material',
        '@emotion/react',
        '@emotion/styled',
        'shared'
      ],
      output: {
        format: 'esm',
        entryFileNames: 'assets/test-app.js', // Use specific name
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