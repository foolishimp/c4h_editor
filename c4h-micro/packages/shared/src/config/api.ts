// File: packages/shared/src/config/api.ts
import axios from 'axios';

// Use process.env for Node.js environment compatibility
// TypeScript doesn't recognize import.meta.env by default
const API_BASE_URL = typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL 
  ? process.env.VITE_API_BASE_URL 
  : 'http://localhost:8000';

// Create an axios instance with the base URL
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Enhanced API endpoints supporting the configuration-driven approach
export const API_ENDPOINTS = {
  // Config endpoints
  CONFIG_TYPES: '/api/v1/config-types',
  CONFIGS: (type: string) => `/api/v1/configs/${type}`,
  CONFIG: (type: string, id: string) => `/api/v1/configs/${type}/${id}`,
  CONFIG_HISTORY: (type: string, id: string) => `/api/v1/configs/${type}/${id}/history`,
  CONFIG_CLONE: (type: string, id: string) => `/api/v1/configs/${type}/${id}/clone`,
  CONFIG_ARCHIVE: (type: string, id: string) => `/api/v1/configs/${type}/${id}/archive`,
  CONFIG_UNARCHIVE: (type: string, id: string) => `/api/v1/configs/${type}/${id}/unarchive`,
  
  // Original workorder endpoints (backward compatibility)
  WORKORDERS: '/api/v1/workorders',
  WORKORDER: (id: string) => `/api/v1/workorders/${id}`,
  WORKORDER_HISTORY: (id: string) => `/api/v1/workorders/${id}/history`,
  WORKORDER_CLONE: (id: string) => `/api/v1/workorders/${id}/clone`,
  WORKORDER_ARCHIVE: (id: string) => `/api/v1/workorders/${id}/archive`,
  WORKORDER_UNARCHIVE: (id: string) => `/api/v1/workorders/${id}/unarchive`, 
  WORKORDER_RENDER: (id: string) => `/api/v1/workorders/${id}/render`,
  WORKORDER_TEST: (id: string) => `/api/v1/workorders/${id}/test`,
   
  // Enhanced job endpoints
  JOBS: '/api/v1/jobs',
  JOB: (id: string) => `/api/v1/jobs/${id}`,
  JOB_CANCEL: (id: string) => `/api/v1/jobs/${id}/cancel`
};

// To make both named and default exports available
export default api;
