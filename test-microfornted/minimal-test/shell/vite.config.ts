// In shell/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

// Update the remote URL to point to the assets directory
const remoteUrl = 'http://localhost:3001/assets/remoteEntry.js';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        form: remoteUrl
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
    cors: true,
    hmr: {
      clientPort: 3000
    }
  }
})