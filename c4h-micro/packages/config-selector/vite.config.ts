/**
 * /packages/config-selector/vite.config.ts
 * Vite configuration for config-selector microfrontend
 * --- UPDATED: Removed 'shared' from externals ---
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Recreate __dirname functionality in ESM if needed for path resolution
// import { fileURLToPath } from 'url';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);


export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/main.tsx'),
      name: 'ConfigSelector',
      formats: ['es'],
      // fileName removed here
    },
    rollupOptions: {
      // Shared removed from externals
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@mui/material',
        '@mui/icons-material',
        '@emotion/react',
        '@emotion/styled'
        // 'shared' // <-- REMOVED
      ],
      output: {
        format: 'esm',
        entryFileNames: 'assets/config-selector.js', // Keep explicit filename
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  // Removed server/preview sections
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/src') // Keep alias for build
    }
  }
});