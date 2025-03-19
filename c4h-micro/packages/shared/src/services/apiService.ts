// File: packages/shared/src/services/apiService.ts
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { configTypes, ConfigTypeMetadata } from '../config/configTypes';

// Base API URL - use environment variable or fallback to localhost
const API_BASE_URL = typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL 
  ? process.env.VITE_API_BASE_URL 
  : 'http://localhost:8000';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Error handling and logging interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log the error for debugging
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Generic API Service class
class ApiService {
  // Basic CRUD operations
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.delete<T>(url, config);
    return response.data;
  }

  // Configuration-specific operations
  async getConfigTypes() {
    return this.get<ConfigTypeMetadata[]>('/api/v1/config-types');
  }

  // Generic config operations by type
  async getConfigs(configType: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.list;
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    return this.get(endpoint);
  }

  async getConfig(configType: string, id: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.get(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    return this.get(endpoint);
  }

  async createConfig(configType: string, data: any) {
    const endpoint = configTypes[configType]?.apiEndpoints.create;
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    return this.post(endpoint, data);
  }

  async updateConfig(configType: string, id: string, data: any) {
    const endpoint = configTypes[configType]?.apiEndpoints.update(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    return this.put(endpoint, data);
  }

  async deleteConfig(configType: string, id: string, commitMessage: string, author: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.delete(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    return this.delete(`${endpoint}?commit_message=${encodeURIComponent(commitMessage)}&author=${encodeURIComponent(author)}`);
  }

  async archiveConfig(configType: string, id: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.archive(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    return this.post(endpoint);
  }

  async unarchiveConfig(configType: string, id: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.unarchive(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    return this.post(endpoint);
  }

  async cloneConfig(configType: string, id: string, newId?: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.clone(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    return this.post(endpoint, { new_id: newId });
  }

  async getConfigHistory(configType: string, id: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.history(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    return this.get(endpoint);
  }

  // Job operations
  async getJobs() {
    return this.get('/api/v1/jobs');
  }

  async getJob(id: string) {
    return this.get(`/api/v1/jobs/${id}`);
  }

  async submitJob(configIds: Record<string, string>, userId?: string, jobConfiguration?: Record<string, any>) {
    const payload = {
      user_id: userId,
      configurations: configIds,
      job_configuration: jobConfiguration || {}
    };
    return this.post('/api/v1/jobs', payload);
  }

  async cancelJob(id: string) {
    return this.post(`/api/v1/jobs/${id}/cancel`);
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
export default apiService;