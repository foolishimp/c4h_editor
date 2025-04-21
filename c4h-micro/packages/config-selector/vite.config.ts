/**
 * /packages/config-selector/vite.config.ts
 * Vite configuration for config-selector microfrontend
 * --- UPDATED: Correct externals, explicit filename, ports removed ---
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
    outDir: 'dist', // Standard output directory
    lib: {
      entry: path.resolve(__dirname, 'src/main.tsx'), // Use absolute path
      name: 'ConfigSelector',
      formats: ['es'],
      // fileName removed here, handled in rollupOptions.output
    },
    rollupOptions: {
      external: [ // Ensure this list is correct
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@mui/material',
        '@mui/icons-material',
        '@emotion/react',
        '@emotion/styled',
        'shared'
        // Add 'js-yaml', 'date-fns', 'yaml-editor' if needed & provided by shell/import map
      ],
      output: {
        format: 'esm',
        // Force the output filename
        entryFileNames: 'assets/config-selector.js',
        // Keep chunk/asset names standard
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
  }
});