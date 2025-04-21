/**
 * /packages/config-selector/vite.config.ts
 * Vite configuration for config-selector microfrontend
 * --- UPDATED: Added @emotion packages to externals ---
 * --- UPDATED: Removed server/preview port config (handled by startup script) ---
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
      entry: './src/main.tsx',
      formats: ['es'], // ESM format for direct browser import
      name: 'ConfigSelector', // Global name (if used in UMD/IIFE)
      fileName: (format) => 'config-selector.js'
    },
    rollupOptions: {
      // Make sure to externalize dependencies provided by the shell's import map
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime', // Also good to externalize jsx-runtime
        '@mui/material',
        '@mui/icons-material',
        '@emotion/react',   // Externalized
        '@emotion/styled',  // Externalized
        'shared'
      ],
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].[hash].js', // Keep hash for chunks
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  // Removed server section previously defining port/strictPort/cors
  // server: {
  //   // port: 3003, // Handled by startup script
  //   // strictPort: true, // Handled by startup script
  //   cors: true // Keep CORS if needed for direct access, but likely handled by script proxy/setup
  // },
  // Removed preview section previously defining port/strictPort/cors
  // preview: {
  //   // port: 3003, // Handled by startup script
  //   // strictPort: true, // Handled by startup script
  //   cors: true
  // },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/src') // Ensure alias points to src
    }
    // Keep dedupe here if it helps resolve other dev server issues,
    // though it might also be redundant if externals/import map work correctly.
    // Can be removed if proven unnecessary after fixing externals.
    // dedupe: [
    //     'react',
    //     'react-dom',
    //     '@mui/material',
    //     '@emotion/react',
    //     '@emotion/styled'
    // ]
  }
});