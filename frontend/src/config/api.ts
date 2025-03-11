/**
 * Centralized API configuration
 */

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';

export const API_ENDPOINTS = {
  WORKORDERS: `${API_BASE_URL}/workorders`,
  WORKORDER: (id: string) => `${API_BASE_URL}/workorders/${id}`,
  WORKORDER_HISTORY: (id: string) => `${API_BASE_URL}/workorders/${id}/history`,
  WORKORDER_DIFF: (id: string) => `${API_BASE_URL}/workorders/${id}/diff`,
  WORKORDER_RENDER: (id: string) => `${API_BASE_URL}/workorders/${id}/render`,
  WORKORDER_TEST: (id: string) => `${API_BASE_URL}/workorders/${id}/test`,
  
  JOBS: `${API_BASE_URL}/jobs`,
  JOB: (id: string) => `${API_BASE_URL}/jobs/${id}`,
  JOB_LOGS: (id: string) => `${API_BASE_URL}/jobs/${id}/logs`,
  
  WORKORDERS: `${API_BASE_URL}/workorders`,
  WORKORDER: (id: string) => `${API_BASE_URL}/workorders/${id}`,
  
  // Legacy endpoints for backward compatibility
  PROMPTS: `${API_BASE_URL}/workorders`,
  PROMPT: (id: string) => `${API_BASE_URL}/workorders/${id}`,
  PROMPT_HISTORY: (id: string) => `${API_BASE_URL}/workorders/${id}/history`,
  PROMPT_DIFF: (id: string) => `${API_BASE_URL}/workorders/${id}/diff`,
  PROMPT_RENDER: (id: string) => `${API_BASE_URL}/workorders/${id}/render`,
  PROMPT_TEST: (id: string) => `${API_BASE_URL}/workorders/${id}/test`
};