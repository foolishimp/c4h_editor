// File: frontend/src/config/api.ts
import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const API_ENDPOINTS = {
  PROMPTS: '/api/prompts',
  PROMPT: (id: string) => `/api/prompts/${id}`,
  PROMPT_HISTORY: (id: string) => `/api/prompts/${id}/history`,
  PROMPT_DIFF: (id: string) => `/api/prompts/${id}/diff`,
  PROMPT_RENDER: (id: string) => `/api/prompts/${id}/render`,
  PROMPT_TEST: (id: string) => `/api/prompts/${id}/test`
};