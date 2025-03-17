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

// Maintain the API_ENDPOINTS export to preserve functionality
export const API_ENDPOINTS = {
  PROMPTS: '/api/v1/prompts',
  PROMPT: (id: string) => `/api/v1/prompts/${id}`,
  PROMPT_HISTORY: (id: string) => `/api/v1/prompts/${id}/history`,
  PROMPT_DIFF: (id: string) => `/api/v1/prompts/${id}/diff`,
  PROMPT_RENDER: (id: string) => `/api/v1/prompts/${id}/render`,
  PROMPT_TEST: (id: string) => `/api/v1/prompts/${id}/test`,
  
  // WorkOrder endpoints
  WORKORDERS: '/api/v1/workorders',
  WORKORDER: (id: string) => `/api/v1/workorders/${id}`,
  WORKORDER_HISTORY: (id: string) => `/api/v1/workorders/${id}/history`,
  WORKORDER_CLONE: (id: string) => `/api/v1/workorders/${id}/clone`,
  WORKORDER_ARCHIVE: (id: string) => `/api/v1/workorders/${id}/archive`,
  WORKORDER_UNARCHIVE: (id: string) => `/api/v1/workorders/${id}/unarchive`, 
  WORKORDER_RENDER: (id: string) => `/api/v1/workorders/${id}/render`,
  WORKORDER_TEST: (id: string) => `/api/v1/workorders/${id}/test`,
   
  // Job endpoints
  JOBS: '/api/v1/jobs',
  JOB: (id: string) => `/api/v1/jobs/${id}`,
  JOB_CANCEL: (id: string) => `/api/v1/jobs/${id}/cancel`
};

// To make both named and default exports available
export default api;