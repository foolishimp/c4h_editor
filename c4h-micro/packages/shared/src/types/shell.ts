/**
 * Type definitions mirroring the Preferences Shell Service API models.
 */
import { JobConfigReference } from './job'; // Assuming this is needed if AppDefinition relates

// MFE types enum for standardization
export type MFEType = 'ESM' | 'WebComponent' | 'Iframe';

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

// Export Frame as FrameDefinition for backward compatibility
export interface FrameDefinition extends Frame {
  // Same as Frame but with alias for backward compatibility
}

// --- Models for Available Apps and Service Endpoints ---

export interface AppDefinition {
  id: string;       // Unique identifier for the App (e.g., 'config-selector').
  name: string;     // Display name of the App (e.g., 'Configuration Manager').
  type: MFEType;    // Type of microfrontend
  url: string;      // URL to load the microfrontend from
  // Legacy fields - kept for backward compatibility but optional
  scope?: string;   // Module Federation scope (legacy)
  module?: string;  // Module Federation module name (legacy)
}

// Preferences represents user-specific shell configuration
export interface Preferences {
  frames: Frame[];
  availableApps?: AppDefinition[]; // Add this property
}
export interface ServiceEndpoints {
  jobConfigServiceUrl?: string; // Base URL for the Job/Config Service API.
  // Add other service endpoints here as needed
}

// --- API Response/Request Models ---

export interface ShellConfigurationResponse {
  preferences: Preferences;
  frames: Frame[]; 
  mainBackendUrl?: string;
  availableApps: AppDefinition[];
  serviceEndpoints: ServiceEndpoints;
}

// Request model if needed by frontend logic later
export interface ShellPreferencesRequest {
  frames: Frame[];
  // Add other preference sections here if needed in the future
}