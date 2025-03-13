// File: frontend/src/config/api.ts
import axios from 'axios';

// Replace process.env with import.meta.env for Vite applications
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create an axios instance with the base URL
const api = axios.create({
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
  
  // Job endpoints
  JOBS: '/api/v1/jobs',
  JOB: (id: string) => `/api/v1/jobs/${id}`,
  JOB_CANCEL: (id: string) => `/api/v1/jobs/${id}/cancel`
};

export default api;