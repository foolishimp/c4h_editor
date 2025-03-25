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

  // Mock data for development
  private mockData: Record<string, any[]> = {
    workorder: [
      {
        id: "workorder-001",
        content: {
          template: {
            text: "Example workorder template",
            parameters: [],
            config: { temperature: 0.7, max_tokens: 1000, stop_sequences: [] }
          }
        },
        metadata: {
          author: "System User",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-02T00:00:00.000Z",
          description: "Example workorder",
          tags: ["example", "demo"],
          version: "1.0.0"
        }
      }
    ],
    teamconfig: [
      {
        id: "teamconfig-001",
        content: {
          llm_config: { providers: [], default_provider: "", default_model: "" },
          orchestration: { enabled: true, teams: [] }
        },
        metadata: {
          author: "System User",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-02T00:00:00.000Z",
          description: "Example team config",
          tags: ["example", "team"],
          version: "1.0.0"
        }
      }
    ],
    runtimeconfig: [
      {
        id: "runtimeconfig-001",
        content: {
          lineage: { enabled: true, namespace: "default" },
          logging: { level: "info", format: "json" },
          backup: { enabled: true, path: "./backups" }
        },
        metadata: {
          author: "System User",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-02T00:00:00.000Z",
          description: "Example runtime config",
          tags: ["example", "runtime"],
          version: "1.0.0"
        }
      }
    ],
    workflow: [
      {
        id: "workflow-001",
        content: {
          steps: [
            {
              id: "step1",
              name: "Initial Step",
              description: "First step in the workflow",
              type: "task",
              next: null
            }
          ],
          entry_point: "step1"
        },
        metadata: {
          author: "System User",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-02T00:00:00.000Z",
          description: "Example workflow",
          tags: ["example", "workflow"],
          version: "1.0.0"
        }
      }
    ]
  };

  // Mock jobs data
  private mockJobs: any[] = [
    {
      id: "job-001",
      configurations: {
        workorder: { id: "workorder-001", version: "1.0.0" },
        teamconfig: { id: "teamconfig-001", version: "1.0.0" },
        runtimeconfig: { id: "runtimeconfig-001", version: "1.0.0" }
      },
      status: "completed",
      service_job_id: "svc-001",
      created_at: "2023-01-03T00:00:00.000Z",
      updated_at: "2023-01-03T01:00:00.000Z",
      submitted_at: "2023-01-03T00:01:00.000Z",
      completed_at: "2023-01-03T00:59:00.000Z",
      user_id: "user1",
      job_configuration: {
        max_runtime: 3600,
        notify_on_completion: true
      },
      result: {
        output: "Job completed successfully",
        artifacts: [],
        metrics: { runtime_seconds: 3540 }
      }
    }
  ];

  // Generic config operations by type
  async getConfigs(configType: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.list;
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    
    // Use mock data for development
    console.log(`API: Fetching configs for type: ${configType}`);
    return this.mockData[configType] || [];
  }

  async getConfig(configType: string, id: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.get(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    
    // Handle special case for 'new'
    if (id === 'new') {
      console.log(`API: Creating new empty config of type ${configType}`);
      const defaultContent = configTypes[configType]?.defaultContent || {};
      return {
        id: '',
        content: defaultContent,
        metadata: {
          author: "Current User",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: "",
          tags: [],
          version: "1.0.0"
        }
      };
    }
    
    // Use mock data for development
    console.log(`API: Fetching config ${id} of type ${configType}`);
    
    // Initialize the type if not already present
    if (!this.mockData[configType]) {
      this.mockData[configType] = [];
    }
    
    const config = this.mockData[configType]?.find(c => c.id === id);
    if (!config) {
      // Improved error message with debugging information
      console.error(`Config not found in mockData:`, {
        requestedId: id,
        configType,
        availableIds: this.mockData[configType]?.map(c => c.id) || []
      });
      throw new Error(`Config ${id} of type ${configType} not found`);
    }
    return config;
  }

  async createConfig(configType: string, data: any): Promise<any> {
    const endpoint = configTypes[configType]?.apiEndpoints.create;
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    
    // Generate ID if not provided
    if (!data.id) {
      data.id = `${configType}-${Date.now()}`;
    }
    
    // Setup metadata if not provided
    if (!data.metadata) {
      data.metadata = {
        author: "Current User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: data.description || "",
        tags: [],
        version: "1.0.0"
      };
    }
    
    // Use mock data for development
    console.log(`API: Creating config of type ${configType} with ID ${data.id}:`, data);
    
    // Initialize the type if not already present
    if (!this.mockData[configType]) {
      this.mockData[configType] = [];
    }
    
    // Check if ID already exists and throw error if it does
    const existing = this.mockData[configType].find(c => c.id === data.id);
    if (existing) {
      console.log(`Config with ID ${data.id} already exists, updating instead`);
      return this.updateConfig(configType, data.id, {
        content: data.content,
        metadata: data.metadata
      });
    }
    
    // Add to mock data
    this.mockData[configType].push(data);
    return data;
  }

  async updateConfig(configType: string, id: string, data: any): Promise<any> {
    const endpoint = configTypes[configType]?.apiEndpoints.update(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    
    // Use mock data for development
    console.log(`API: Updating config ${id} of type ${configType}:`, data);
    
    // Initialize the type if not already present
    if (!this.mockData[configType]) {
      this.mockData[configType] = [];
    }
    
    // Find and update in mock data
    const index = this.mockData[configType]?.findIndex(c => c.id === id) ?? -1;
    if (index === -1) {
      // Create new if doesn't exist
      return this.createConfig(configType, {
        id,
        ...data
      });
    }
    
    // Update and return
    this.mockData[configType][index] = {
      ...this.mockData[configType][index],
      ...data,
      id, // Ensure ID is preserved
      metadata: {
        ...this.mockData[configType][index].metadata,
        ...data.metadata,
        updated_at: new Date().toISOString()
      }
    };
    
    return this.mockData[configType][index];
  }

  async deleteConfig(configType: string, id: string, commitMessage: string, author: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.delete(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    
    // Use mock data for development
    console.log(`API: Deleting config ${id} of type ${configType}`);
    
    // Filter out from mock data
    if (this.mockData[configType]) {
      this.mockData[configType] = this.mockData[configType].filter(c => c.id !== id);
    }
    
    return { message: `Configuration ${id} deleted successfully` };
  }

  async archiveConfig(configType: string, id: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.archive(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    
    // Use mock data for development
    console.log(`API: Archiving config ${id} of type ${configType}`);
    
    // Find and update in mock data
    const index = this.mockData[configType]?.findIndex(c => c.id === id) ?? -1;
    if (index !== -1) {
      this.mockData[configType][index].metadata.archived = true;
    }
    
    return { message: `Configuration ${id} archived successfully` };
  }

  async unarchiveConfig(configType: string, id: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.unarchive(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    
    // Use mock data for development
    console.log(`API: Unarchiving config ${id} of type ${configType}`);
    
    // Find and update in mock data
    const index = this.mockData[configType]?.findIndex(c => c.id === id) ?? -1;
    if (index !== -1) {
      this.mockData[configType][index].metadata.archived = false;
    }
    
    return { message: `Configuration ${id} unarchived successfully` };
  }

  async cloneConfig(configType: string, id: string, newId?: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.clone(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    
    // Use mock data for development
    console.log(`API: Cloning config ${id} of type ${configType} to ${newId}`);
    
    // Find the source config
    const sourceConfig = this.mockData[configType]?.find(c => c.id === id);
    if (!sourceConfig) {
      throw new Error(`Config ${id} of type ${configType} not found`);
    }
    
    // Create a deep clone
    const clonedConfig = JSON.parse(JSON.stringify(sourceConfig));
    
    // Update properties
    clonedConfig.id = newId || `${configType}-${Date.now()}`;
    clonedConfig.metadata = {
      ...clonedConfig.metadata,
      author: "Current User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: `Clone of ${id}: ${clonedConfig.metadata.description || ''}`,
      version: "1.0.0"
    };
    
    // Add to mock data
    if (!this.mockData[configType]) {
      this.mockData[configType] = [];
    }
    this.mockData[configType].push(clonedConfig);
    
    return clonedConfig;
  }

  async getConfigHistory(configType: string, id: string) {
    const endpoint = configTypes[configType]?.apiEndpoints.history(id);
    if (!endpoint) throw new Error(`Unknown config type: ${configType}`);
    
    // Use mock data for development
    console.log(`API: Fetching history for config ${id} of type ${configType}`);
    
    // Generate mock history
    return {
      config_id: id,
      config_type: configType,
      versions: [
        {
          version: "1.0.0",
          commit_hash: "abc123",
          created_at: new Date().toISOString(),
          author: "Current User",
          message: "Initial creation"
        }
      ]
    };
  }

  // Job operations
  async getJobs() {
    console.log('API: Fetching all jobs');
    // Use mock data for development
    return {
      items: this.mockJobs,
      total: this.mockJobs.length,
      limit: 100,
      offset: 0
    };
  }

  async getJob(id: string) {
    console.log(`API: Fetching job ${id}`);
    // Use mock data for development
    const job = this.mockJobs.find(j => j.id === id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }
    return job;
  }

  async submitJob(configIds: Record<string, string>, userId?: string, jobConfiguration?: Record<string, any>) {
    console.log('API: Submitting job with configs:', configIds);
    
    // Create new job in mock data
    const newJob = {
      id: `job-${Date.now()}`,
      configurations: Object.entries(configIds).reduce((acc, [type, id]) => {
        acc[type] = { id, version: "1.0.0" };
        return acc;
      }, {} as Record<string, any>),
      status: "submitted",
      service_job_id: `svc-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      user_id: userId || "current-user",
      job_configuration: jobConfiguration || {
        max_runtime: 3600,
        notify_on_completion: true
      }
    };
    
    this.mockJobs.push(newJob);
    
    // Simulate job progression after a delay
    setTimeout(() => {
      const index = this.mockJobs.findIndex(j => j.id === newJob.id);
      if (index !== -1) {
        this.mockJobs[index].status = "running";
        this.mockJobs[index].updated_at = new Date().toISOString();
        
        // Complete after another delay
        setTimeout(() => {
          const index = this.mockJobs.findIndex(j => j.id === newJob.id);
          if (index !== -1) {
            this.mockJobs[index].status = "completed";
            this.mockJobs[index].updated_at = new Date().toISOString();
            this.mockJobs[index].completed_at = new Date().toISOString();
            this.mockJobs[index].result = {
              output: "Job completed successfully",
              artifacts: [],
              metrics: { runtime_seconds: Math.floor(Math.random() * 100) + 50 }
            };
          }
        }, 10000);
      }
    }, 5000);
    
    return newJob;
  }

  async cancelJob(id: string) {
    console.log(`API: Cancelling job ${id}`);
    
    // Find and update in mock data
    const index = this.mockJobs.findIndex(j => j.id === id);
    if (index === -1) {
      throw new Error(`Job ${id} not found`);
    }
    
    // Only allow cancellation for certain states
    const allowedStates = ['created', 'submitted', 'running'];
    if (!allowedStates.includes(this.mockJobs[index].status)) {
      throw new Error(`Cannot cancel job in state: ${this.mockJobs[index].status}`);
    }
    
    this.mockJobs[index].status = "cancelled";
    this.mockJobs[index].updated_at = new Date().toISOString();
    this.mockJobs[index].completed_at = new Date().toISOString();
    
    return this.mockJobs[index];
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
export default apiService;