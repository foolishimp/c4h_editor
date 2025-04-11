import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { configTypes, ConfigTypeMetadata } from '../config/configTypes'; 
import { Job, JobStatus, JobListResponse, JobConfigReference } from '../types/job';

const API_BASE_URL = typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL 
  ? process.env.VITE_API_BASE_URL 
  : 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
); 

class ApiService {
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
  
  async getConfigs(configType: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.list;
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    console.log(`API: Fetching configs for type: ${configType} from ${endpoint}`);
    const response = await this.get<any[]>(endpoint);
    console.log(`API: Received ${response.length} configs from server`);
    return response;
  } 

  async getConfig(configType: string, id: string): Promise<any> {
    const endpoint = configTypes[configType]?.apiEndpoints.get(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    if (id === 'new') {
      console.log(`API: Creating new empty config of type ${configType}`);
      return this.createEmptyConfig(configType, '');
    }
    console.log(`API: Fetching config ${id} of type ${configType} from ${endpoint}`);
    
    try {
      return this.get<any>(endpoint);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`Config ${id} not found, creating new with this ID`);
        return this.createEmptyConfig(configType, id);
      }
      throw error;
    }
  }
  
  private createEmptyConfig(configType: string, id: string): any {
    const defaultContent = configTypes[configType]?.defaultContent || {};
    console.log(`API: Creating empty config of type ${configType} with ID ${id || 'empty'}`);
    
    return {
      id: id,
      content: defaultContent,
      metadata: {
        description: "", // Explicitly initialize description
        author: "Current User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [],
        version: "1.0.0"
      }
    };
  }
  
  async createConfig(configType: string, data: any): Promise<any> {
    const endpoint = configTypes[configType]?.apiEndpoints.create;
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    console.log(`API: Creating config of type ${configType} with ID ${data.id} at ${endpoint}`);
    
    // Add missing required fields
    const requestData = {
      ...data,
      commit_message: data.commit_message || `Create new ${configType}`,
      author: data.author || data.metadata?.author || "Current User"
    };
    console.log(`API: Submitting config create request:`, {
      id: data.id, endpoint, description: data.metadata?.description
    });
    
    try {
      return this.post<any>(endpoint, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`Config with ID ${data.id} already exists, updating instead`);
        return this.updateConfig(configType, data.id, {
          content: data.content,
          metadata: data.metadata,
          commit_message: requestData.commit_message,
          author: requestData.author
        });
      }
      throw error;
    }
  }
  
  async updateConfig(configType: string, id: string, data: any): Promise<any> {
    const endpoint = configTypes[configType]?.apiEndpoints.update(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    console.log(`API: Updating config ${id} of type ${configType} at ${endpoint}`);
    
    // Add missing required fields
    const requestData = {
      ...data,
      commit_message: data.commit_message || `Update ${configType}`,
      author: data.author || data.metadata?.author || "Current User"
    };
    console.log(`API: Submitting config update request:`, {
      id, endpoint, description: data.metadata?.description
    });

    try {
      return this.put<any>(endpoint, requestData);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`Config ${id} not found, creating new`);
        return this.createConfig(configType, { id, ...data });
      }
      throw error;
    }
  }
  
  async deleteConfig(configType: string, id: string, commitMessage: string = "Deleted via UI", author: string = "Current User") {
    const endpoint = configTypes[configType]?.apiEndpoints.delete(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    console.log(`API: Deleting config ${id} of type ${configType} at ${endpoint}`);
    // Pass parameters as query params
    return this.delete<{ message: string }>(endpoint, { 
      params: { 
        commit_message: commitMessage,
        author 
      }
    });
  }
  
  async archiveConfig(configType: string, id: string, author: string = "Current User") {
    const endpoint = configTypes[configType]?.apiEndpoints.archive(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    console.log(`API: Archiving config ${id} of type ${configType} at ${endpoint}`);
    // Pass author as a query parameter
    return this.post<{ message: string }>(endpoint, {}, { params: { author } });
  }
   
  async unarchiveConfig(configType: string, id: string, author: string = "Current User") {
    const endpoint = configTypes[configType]?.apiEndpoints.unarchive(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    console.log(`API: Unarchiving config ${id} of type ${configType} at ${endpoint}`);
    // Pass author as a query parameter
    return this.post<{ message: string }>(endpoint, {}, { params: { author } });
  }
  
  async cloneConfig(configType: string, id: string, newId: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.clone(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    console.log(`API: Cloning config ${id} of type ${configType} to ${newId} at ${endpoint}`);
    // Pass new_id as a query parameter
    return this.post<any>(endpoint, {}, { params: { new_id: newId, author: "Current User" } });
  }
  
  async getConfigHistory(configType: string, id: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.history(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    console.log(`API: Fetching history for config ${id} of type ${configType} at ${endpoint}`);
    return this.get<{ config_id: string; config_type: string; versions: Array<{ version: string; commit_hash: string; created_at: string; author: string; message: string; }> }>(endpoint);
  }

  // Job API methods
  async getJobs() {
    console.log('API: Fetching all jobs from /api/v1/jobs');
    try {
      const response = await this.get<JobListResponse>('/api/v1/jobs');
      console.log(`API: Received ${response.items?.length || 0} jobs`);
      return response;
    } catch (error) {
      console.error('Error fetching jobs:', error);
      throw error;
    }
  }
  
  async getJob(id: string) {
    console.log(`API: Fetching job ${id} from /api/v1/jobs/${id}`);
    try {
      const response = await this.get<any>(`/api/v1/jobs/${id}`);
      console.log(`API: Received job details for ${id}`);
      return response;
    } catch (error) {
      console.error(`Error fetching job ${id}:`, error);
      throw error;
    }
  }
  
  async submitJob(params: {
    workorder: string,
    teamconfig: string,
    runtimeconfig: string,
    userId?: string,
    jobConfiguration?: Record<string, any>
  }) {
    console.log('API: Submitting job with configs:', params);
    
    // Format the request according to the API expectations
    const requestData = {
      workorder: { id: params.workorder, version: "latest", config_type: "workorder" },
      team: { id: params.teamconfig, version: "latest", config_type: "teamconfig" },
      runtime: { id: params.runtimeconfig, version: "latest", config_type: "runtimeconfig" },
      user_id: params.userId || 'current-user',
      job_configuration: params.jobConfiguration || { max_runtime: 3600, notify_on_completion: true }
    };
    
    return this.post<any>('/api/v1/jobs', requestData);
  }
  
  async submitJobTuple(workorderId: string, teamconfigId: string, runtimeconfigId: string, userId?: string) {
    // Legacy method - uses the old format
    console.log(`API: Submitting job tuple with workorder=${workorderId}, team=${teamconfigId}, runtime=${runtimeconfigId}`);
    
    const requestData = {
      configurations: {
        workorder: { id: workorderId, version: "latest", config_type: "workorder" },
        team: { id: teamconfigId, version: "latest", config_type: "teamconfig" },
        runtime: { id: runtimeconfigId, version: "latest", config_type: "runtimeconfig" },
      },
      user_id: userId || 'current-user',
      job_configuration: { max_runtime: 3600, notify_on_completion: true }
    };
    
    return this.post<any>('/api/v1/jobs', requestData);
  }

  async submitJobConfigs(
    configs: JobConfigReference[],
    userId?: string,
    jobConfiguration?: Record<string, any>
  ) {
    console.log('API: Submitting job with configurations list:', configs);

    if (!configs || configs.length === 0) {
      throw new Error('At least one configuration must be provided');
    }

    // Fill in default version if not provided
    const configurations = configs.map(config => ({
      ...config,
      version: config.version || 'latest'
    }));

    // Create request data with configurations list
    const requestData = {
      configurations,
      user_id: userId || 'current-user',
      job_configuration: jobConfiguration || { max_runtime: 3600, notify_on_completion: true }
    };
    return this.post<any>('/api/v1/jobs/multi-config', requestData); // Use the new endpoint
  }
  
  async cancelJob(id: string) {
    console.log(`API: Cancelling job ${id}`);
    return this.post<any>(`/api/v1/jobs/${id}/cancel`, {}); 
  }
  
  async getJobHistory(id: string) {
    console.log(`API: Fetching history for job ${id}`);
    return this.get<any>(`/api/v1/jobs/${id}/history`);
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export the axios instance as well
export const api = axiosInstance;

// Export as default for backward compatibility
export default axiosInstance;