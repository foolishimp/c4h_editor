import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',                // serve index.html from project root
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // give the entry chunk the name "test-app" so we emit assets/test‑app.js
      input: { 'test-app': 'index.html' },
      output: {
        entryFileNames:    'assets/[name].js',
        chunkFileNames:    'assets/[name].js',
        assetFileNames:    'assets/[name].[ext]',
      },
    },
  },
  server: {
    port: 3005,
    strictPort: true,
  },
});
