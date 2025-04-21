/**
 * /packages/shared/src/config/api.ts
 * API endpoints and axios instance configuration
 */
import axios from 'axios';

// Use a simple default URL - will be properly configured by the shell
const API_BASE_URL = 'http://localhost:8000';

// Create an axios instance with the base URL
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// API endpoints
export const API_ENDPOINTS = {
  // Config types endpoint
  CONFIG_TYPES: '/api/v1/config-types',
  
  // Config endpoints (generic)
  CONFIGS: (type: string) => `/api/v1/configs/${type}`,
  CONFIG: (type: string, id: string) => `/api/v1/configs/${type}/${id}`,
  CONFIG_HISTORY: (type: string, id: string) => `/api/v1/configs/${type}/${id}/history`,
  CONFIG_CLONE: (type: string, id: string) => `/api/v1/configs/${type}/${id}/clone`,
  CONFIG_ARCHIVE: (type: string, id: string) => `/api/v1/configs/${type}/${id}/archive`,
  CONFIG_UNARCHIVE: (type: string, id: string) => `/api/v1/configs/${type}/${id}/unarchive`,
  
  // Job endpoints
  JOBS: '/api/v1/jobs',
  JOB: (id: string) => `/api/v1/jobs/${id}`,
  JOB_CANCEL: (id: string) => `/api/v1/jobs/${id}/cancel`,
  
  // Legacy endpoints for backward compatibility
  WORKORDERS: '/api/v1/workorders',
  WORKORDER: (id: string) => `/api/v1/workorders/${id}`,
  WORKORDER_HISTORY: (id: string) => `/api/v1/workorders/${id}/history`,
  WORKORDER_CLONE: (id: string) => `/api/v1/workorders/${id}/clone`,
  WORKORDER_ARCHIVE: (id: string) => `/api/v1/workorders/${id}/archive`,
  WORKORDER_UNARCHIVE: (id: string) => `/api/v1/workorders/${id}/unarchive`, 
  WORKORDER_RENDER: (id: string) => `/api/v1/workorders/${id}/render`,
  WORKORDER_TEST: (id: string) => `/api/v1/workorders/${id}/test`
};

// Export default api instance
export default api;