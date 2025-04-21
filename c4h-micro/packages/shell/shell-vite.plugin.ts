/**
 * /packages/shell/vite-shell-plugin.ts
 * Custom Vite plugin to support microfrontend development
 */
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export default function shellPlugin(): Plugin {
  return {
    name: 'vite-plugin-shell',
    
    configureServer(server) {
      // Serve shared package for import map
      server.middlewares.use('/shared', (req, res, next) => {
        const requestPath = req.url || '';
        const filePath = path.resolve(__dirname, '../shared/src', requestPath.replace(/^\//, ''));
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(fs.readFileSync(filePath, 'utf-8'));
        } else {
          // If exact file not found, try to send index.ts
          const indexPath = path.resolve(__dirname, '../shared/src/index.ts');
          if (fs.existsSync(indexPath)) {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(fs.readFileSync(indexPath, 'utf-8'));
          } else {
            next();
          }
        }
      });
      
      // Add mock API endpoints for development if needed
      server.middlewares.use('/api/v1/shell/configuration', (req, res) => {
        const mockConfig = {
          preferences: {
            frames: [
              {
                id: 'test-frame',
                name: 'Test',
                order: 0,
                assignedApps: [{ appId: 'test-app' }]
              },
              {
                id: 'config-frame',
                name: 'Config',
                order: 1,
                assignedApps: [{ appId: 'config-selector-workorder' }]
              },
              {
                id: 'jobs-frame',
                name: 'Jobs',
                order: 2,
                assignedApps: [{ appId: 'job-management' }]
              }
            ]
          },
          frames: [
            {
              id: 'test-frame',
              name: 'Test',
              order: 0,
              assignedApps: [{ appId: 'test-app' }]
            },
            {
              id: 'config-frame',
              name: 'Config',
              order: 1,
              assignedApps: [{ appId: 'config-selector-workorder' }]
            },
            {
              id: 'jobs-frame',
              name: 'Jobs',
              order: 2,
              assignedApps: [{ appId: 'job-management' }]
            }
          ],
          mainBackendUrl: 'http://localhost:8000',
          availableApps: [
            {
              id: 'test-app',
              name: 'Test App',
              type: 'ESM',
              url: 'http://localhost:3005/assets/test-app.js'
            },
            {
              id: 'config-selector-workorder',
              name: 'Workorder Config',
              type: 'ESM',
              url: 'http://localhost:3003/assets/config-selector.js'
            },
            {
              id: 'job-management',
              name: 'Job Management',
              type: 'ESM',
              url: 'http://localhost:3004/assets/job-management.js'
            }
          ],
          serviceEndpoints: {
            jobConfigServiceUrl: 'http://localhost:8000'
          }
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(mockConfig));
      });
      
      // Add CORS headers to all responses
      server.middlewares.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        
        next();
      });
    }
  };
}