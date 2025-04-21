import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    cssCodeSplit: false,
    lib: {
      entry: './src/main.tsx',
      formats: ['es'],
      fileName: () => 'test-app.js'
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom', 
        'shared'
      ],
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
});