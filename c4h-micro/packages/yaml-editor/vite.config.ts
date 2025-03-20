// File: packages/yaml-editor/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  // Empty base for proper path resolution
  base: '',
  plugins: [
    react(),
    federation({
      name: 'yamlEditor',
      filename: 'remoteEntry.js',
      exposes: {
        './YamlEditor': './src/YamlEditor.tsx',
      },
      shared: {
        // Using type assertion to bypass TypeScript errors for valid properties
        // that aren't included in the type definitions
        react: { 
          requiredVersion: '^18.0.0',
          eager: true 
        } as any, 
        'react-dom': { 
          requiredVersion: '^18.0.0',
          eager: true 
        } as any,
        '@monaco-editor/react': { 
          requiredVersion: '^4.5.0'
        } as any,
        'monaco-editor': {} as any
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/dist')
    },
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    modulePreload: false,
    // Add assetsDir for consistent asset paths
    assetsDir: '',
    rollupOptions: {
      output: {
        format: 'esm',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  server: {
    port: 3002,
    strictPort: true,
    hmr: {
      timeout: 5000
    },
    cors: true
  },
  preview: {
    port: 3002, // Fixed port to match the expected URL
    strictPort: true,
    cors: true  // Enable CORS for cross-origin requests
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});