/**
 * Type definitions mirroring the Preferences Shell Service API models.
 */
import { JobConfigReference } from './job'; // Assuming this is needed if AppDefinition relates

// --- Models for UI Configuration ---

export interface AppAssignment {
  appId: string; // The unique ID of the assigned AppDefinition.
  // layoutInfo?: Record<string, any>; // Optional layout info
}

export interface Frame {
  id: string; // Unique identifier for the Frame.
  name: string; // Display name of the Frame.
  order: number; // Display order of the Frame.
  assignedApps: AppAssignment[]; // Apps assigned to this Frame.
}

// --- Models for Available Apps and Service Endpoints ---

export interface AppDefinition {
  id: string; // Unique identifier for the App (e.g., 'config-selector').
  name: string; // Display name of the App (e.g., 'Configuration Manager').
  scope: string; // Module Federation scope (e.g., 'configSelector').
  module: string; // Module Federation module name (e.g., './ConfigManager').
  url?: string; // Optional URL for the remoteEntry.js if not standard.
  type: 'ESM' | 'Iframe' | 'WebComponent'; // Type of microfrontend
}

export interface ServiceEndpoints {
  jobConfigServiceUrl?: string; // Base URL for the Job/Config Service API.
  // Add other service endpoints here as needed
}

// --- API Response/Request Models ---

export interface ShellConfigurationResponse {
  frames: Frame[];
  availableApps: AppDefinition[];
  serviceEndpoints: ServiceEndpoints;
}

// Request model if needed by frontend logic later
export interface ShellPreferencesRequest {
  frames: Frame[];
  // Add other preference sections here if needed in the future
}