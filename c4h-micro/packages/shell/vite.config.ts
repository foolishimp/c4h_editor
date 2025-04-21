/**
 * /packages/shell/vite.config.ts
 * Vite configuration for the shell application
 * --- UPDATED: Includes middleware for '/shared', ports removed ---
 */
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Recreate __dirname functionality in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Custom Plugin to Serve Built Shared Package ---
function serveSharedPlugin(): Plugin {
  return {
    name: 'vite-plugin-serve-shared-dist', // Plugin name
    configureServer(server) {
      const sharedDistPath = path.resolve(__dirname, '../shared/dist/build');
      console.log(`[Shell Vite Server - Shared] Middleware configured. Serving '/shared' from: ${sharedDistPath}`);

      server.middlewares.use('/shared', async (req, res, next) => {
        const requestedPath = req.url?.split('?')[0] || '';
        let relativeFilePath = requestedPath === '/' ? 'index.js' : requestedPath.substring(1);

        // Attempt to append .js if no extension is present
        if (!path.extname(relativeFilePath) && relativeFilePath !== '') {
            relativeFilePath += '.js';
        }

        const absoluteFilePath = path.join(sharedDistPath, relativeFilePath);
        console.log(`[Shell Vite Server - Shared] Request '${req.url}' mapped to filesystem path: ${absoluteFilePath}`);

        try {
          if (fs.existsSync(absoluteFilePath) && fs.statSync(absoluteFilePath).isFile()) {
            const contentType = absoluteFilePath.endsWith('.js') ? 'application/javascript' : 'text/plain';
            console.log(`[Shell Vite Server - Shared] Serving: ${absoluteFilePath} (Content-Type: ${contentType})`);

            const content = await fs.promises.readFile(absoluteFilePath, 'utf-8');
            res.setHeader('Content-Type', contentType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'no-cache');
            res.statusCode = 200;
            res.end(content);
          } else {
            console.log(`[Shell Vite Server - Shared] File not found: ${absoluteFilePath}`);
            next();
          }
        } catch (err: any) {
           if (err.code === 'ENOENT') {
               console.log(`[Shell Vite Server - Shared] File not found (ENOENT during read): ${absoluteFilePath}`);
           } else {
               console.error(`[Shell Vite Server - Shared] Error accessing file ${absoluteFilePath}:`, err);
               res.statusCode = 500;
               res.end('Internal Server Error');
               return;
           }
           next();
        }
      });
    }
  };
}
// --- End Custom Plugin ---

export default defineConfig({
  plugins: [
    react(),
    serveSharedPlugin() // Add the custom plugin here
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022'
    },
    include: ['shared']
  },
  esbuild: {
    target: 'es2022'
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/src')
    }
  },
  // server/preview port config removed
  server: {
    cors: true
  },
  preview: {
    cors: true
  }
});