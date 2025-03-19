// File: packages/shared/src/config/configTypes.ts
/**
 * Configuration Type Registry
 * 
 * This file defines all supported configuration types and their metadata.
 * New configuration types can be added here without code changes.
 */

export interface ConfigTypeMetadata {
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
  };
}

const configTypes: Record<string, ConfigTypeMetadata> = {
  workorder: {
    name: "Work Order",
    description: "Defines what needs to be done and against which asset",
    supportsVersioning: true,
    apiEndpoints: {
      list: "/api/v1/configs/workorder",
      get: (id: string) => `/api/v1/configs/workorder/${id}`,
      create: "/api/v1/configs/workorder",
      update: (id: string) => `/api/v1/configs/workorder/${id}`,
      delete: (id: string) => `/api/v1/configs/workorder/${id}`,
      archive: (id: string) => `/api/v1/configs/workorder/${id}/archive`,
      unarchive: (id: string) => `/api/v1/configs/workorder/${id}/unarchive`,
      clone: (id: string) => `/api/v1/configs/workorder/${id}/clone`,
      history: (id: string) => `/api/v1/configs/workorder/${id}/history`
    }
  },
  teamconfig: {
    name: "Team Configuration",
    description: "Defines the agent teams and their capabilities",
    supportsVersioning: true,
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
    }
  },
  runtimeconfig: {
    name: "Runtime Configuration",
    description: "Manages operational aspects of the C4H Service",
    supportsVersioning: true,
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
    }
  }
};

// Backward compatibility with existing API endpoints
const backwardCompatibilityAliases = {
  workorders: "workorder"
};

// Export the config types registry
export { configTypes, backwardCompatibilityAliases };
export default configTypes;
