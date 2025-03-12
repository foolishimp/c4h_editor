// File: frontend/src/config/api.ts
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const API_ENDPOINTS = {
  // WorkOrder endpoints
  WORKORDERS: `${API_BASE_URL}/workorders`,
  WORKORDER: (id: string) => `${API_BASE_URL}/workorders/${id}`,
  WORKORDER_HISTORY: (id: string) => `${API_BASE_URL}/workorders/${id}/history`,
  WORKORDER_DIFF: (id: string, versionId: string) => `${API_BASE_URL}/workorders/${id}/diff/${versionId}`,
  WORKORDER_VERSION: (id: string, versionId: string) => `${API_BASE_URL}/workorders/${id}/versions/${versionId}`,
  WORKORDER_RENDER: (id: string) => `${API_BASE_URL}/workorders/${id}/render`,
  WORKORDER_TEST: (id: string) => `${API_BASE_URL}/workorders/${id}/test`,
  
  // Job endpoints
  JOBS: `${API_BASE_URL}/jobs`,
  JOB: (id: string) => `${API_BASE_URL}/jobs/${id}`,
  JOB_CANCEL: (id: string) => `${API_BASE_URL}/jobs/${id}/cancel`,
  JOB_SUBMIT: `${API_BASE_URL}/jobs/submit`,
};

// Create axios instance for API requests
export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});