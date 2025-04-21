/**
 * /packages/yaml-editor/vite.config.ts
 * Vite configuration for yaml-editor microfrontend
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
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    lib: {
      entry: './src/main.tsx', // Entry point for yaml-editor
      formats: ['es'],
      fileName: () => 'yaml-editor.js' // Output filename
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
        // Add 'js-yaml', '@monaco-editor/react', 'monaco-editor' if they should ALSO be externalized
        // and provided by the shell's import map (if shared)
      ],
      output: {
        format: 'esm',
        entryFileNames: 'assets/yaml-editor.js', // Use specific name
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