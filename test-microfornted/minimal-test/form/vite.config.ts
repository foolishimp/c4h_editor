// file: minimal-test/form/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'formApp',
      filename: 'remoteEntry.js',
      exposes: {
        './SimpleForm': './src/SimpleForm.tsx',
      },
      shared: ['react', 'react-dom']
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  },
  server: {
    fs: {
      // Allow serving files from one level up
      allow: ['..']
    }
  }
})
