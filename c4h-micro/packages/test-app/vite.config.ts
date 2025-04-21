/**
 * /packages/test-app/vite.config.ts
 * Vite configuration for test-app microfrontend
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
    minify: false, // Disable minification for better debugging
    cssCodeSplit: false,
    lib: {
      entry: './src/main.tsx',
      formats: ['es'], // ESM format only
      fileName: () => 'test-app.js'
    },
    rollupOptions: {
      // External packages that shouldn't be bundled
      external: [
        'react',
        'react-dom', 
        'react/jsx-runtime',
        'shared',
        '@mui/material',
        '@mui/icons-material',
        '@emotion/react',
        '@emotion/styled'
      ],
      output: {
        // Preserve the ESM format
        format: 'esm',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/src')
    }
  },
  server: {
    port: 3005,
    strictPort: true,
    cors: true
  },
  preview: {
    port: 3005,
    strictPort: true,
    cors: true
  }
});