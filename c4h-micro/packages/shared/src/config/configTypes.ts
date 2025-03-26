/**
 * Configuration Type Registry
 * 
 * This file defines all supported configuration types and their metadata.
 * New configuration types can be added here without code changes.
 */

export interface ConfigTypeMetadata {
  type: string;
  name: string;
  description: string;
  supportsVersioning: boolean;
  apiEndpoints: {
    list: string;
    get: (id: string) => string;
    create: string;
    update: (id: string) => string;
    delete: (id: string) => string;
    archive: (id: string) => string;
    unarchive: (id: string) => string;
    clone: (id: string) => string;
    history: (id: string) => string;
    render?: (id: string) => string;
    test?: (id: string) => string;
  };
  defaultContent?: Record<string, any>;
  requiredForJob: boolean;
  icon?: string; // Material UI icon name
}

const configTypes: Record<string, ConfigTypeMetadata> = {
  workorder: {
    type: "workorder",
    name: "Work Order",
    description: "Defines what needs to be done and against which asset",
    supportsVersioning: true,
    requiredForJob: true,
    icon: "Description",
    apiEndpoints: {
      list: "/api/v1/configs/workorder",
      get: (id: string) => `/api/v1/configs/workorder/${id}`,
      create: "/api/v1/configs/workorder",
      update: (id: string) => `/api/v1/configs/workorder/${id}`,
      delete: (id: string) => `/api/v1/configs/workorder/${id}`,
      archive: (id: string) => `/api/v1/configs/workorder/${id}/archive`,
      unarchive: (id: string) => `/api/v1/configs/workorder/${id}/unarchive`,
      clone: (id: string) => `/api/v1/configs/workorder/${id}/clone`,
      history: (id: string) => `/api/v1/configs/workorder/${id}/history`,
      render: (id: string) => `/api/v1/configs/workorder/${id}/render`,
      test: (id: string) => `/api/v1/configs/workorder/${id}/test`
    },
    defaultContent: {
      template: {
        text: "",
        parameters: [],
        config: {
          temperature: 0.7,
          max_tokens: 1000,
          stop_sequences: []
        }
      }
    }
  },
  teamconfig: {
    type: "teamconfig",
    name: "Team Configuration",
    description: "Defines the agent teams and their capabilities",
    supportsVersioning: true,
    requiredForJob: true,
    icon: "Group",
    apiEndpoints: {
      list: "/api/v1/configs/teamconfig",
      get: (id: string) => `/api/v1/configs/teamconfig/${id}`,
      create: "/api/v1/configs/teamconfig",
      update: (id: string) => `/api/v1/configs/teamconfig/${id}`,
      delete: (id: string) => `/api/v1/configs/teamconfig/${id}`,
      archive: (id: string) => `/api/v1/configs/teamconfig/${id}/archive`,
      unarchive: (id: string) => `/api/v1/configs/teamconfig/${id}/unarchive`,
      clone: (id: string) => `/api/v1/configs/teamconfig/${id}/clone`,
      history: (id: string) => `/api/v1/configs/teamconfig/${id}/history`
    },
    defaultContent: {
      roles: [
        {
          name: "Default Role",
          description: "Default role with basic capabilities",
          capabilities: ["chat", "research"],
          config: {}
        }
      ],
      teams: [],
      default_team: "",
      global_config: {
        llm_settings: {
          default_model: "",
          default_provider: ""
        }
      }
    }
  },
  runtimeconfig: {
    type: "runtimeconfig",
    name: "Runtime Configuration",
    description: "Manages operational aspects of the C4H Service",
    supportsVersioning: true,
    requiredForJob: true,
    icon: "Settings",
    apiEndpoints: {
      list: "/api/v1/configs/runtimeconfig",
      get: (id: string) => `/api/v1/configs/runtimeconfig/${id}`,
      create: "/api/v1/configs/runtimeconfig",
      update: (id: string) => `/api/v1/configs/runtimeconfig/${id}`,
      delete: (id: string) => `/api/v1/configs/runtimeconfig/${id}`,
      archive: (id: string) => `/api/v1/configs/runtimeconfig/${id}/archive`,
      unarchive: (id: string) => `/api/v1/configs/runtimeconfig/${id}/unarchive`,
      clone: (id: string) => `/api/v1/configs/runtimeconfig/${id}/clone`,
      history: (id: string) => `/api/v1/configs/runtimeconfig/${id}/history`
    },
    defaultContent: {
      lineage: {
        enabled: true,
        namespace: "default"
      },
      logging: {
        level: "info",
        format: "json"
      },
      backup: {
        enabled: true,
        path: "./backups"
      }
    }
  },
  workflow: {
    type: "workflow",
    name: "Workflow",
    description: "Defines the workflow steps and execution path",
    supportsVersioning: true,
    requiredForJob: false,
    icon: "AccountTree",
    apiEndpoints: {
      list: "/api/v1/configs/workflow",
      get: (id: string) => `/api/v1/configs/workflow/${id}`,
      create: "/api/v1/configs/workflow",
      update: (id: string) => `/api/v1/configs/workflow/${id}`,
      delete: (id: string) => `/api/v1/configs/workflow/${id}`,
      archive: (id: string) => `/api/v1/configs/workflow/${id}/archive`,
      unarchive: (id: string) => `/api/v1/configs/workflow/${id}/unarchive`,
      clone: (id: string) => `/api/v1/configs/workflow/${id}/clone`,
      history: (id: string) => `/api/v1/configs/workflow/${id}/history`
    },
    defaultContent: {
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
    }
  }
};

// Backward compatibility with existing API endpoints
const backwardCompatibilityAliases: Record<string, string> = {
  workorders: "workorder",
  teamconfigs: "teamconfig",
  runtimeconfigs: "runtimeconfig",
  workflows: "workflow"
};

// Export the config types registry
export { configTypes, backwardCompatibilityAliases };
export default configTypes;