// File: packages/shared/src/types/federation.d.ts
/**
 * TypeScript definitions for Module Federation
 * Supports both Webpack and Vite implementations
 */

declare module '@originjs/vite-plugin-federation' {
  // Export the default function
  export default function federation(options: FederationOptions): any;
  
  // Define the federation options interface
  export interface FederationOptions {
    name?: string;
    filename?: string;
    exposes?: Record<string, string>;
    remotes?: Record<string, string>;
    shared?: Record<string, SharedConfig | boolean>;
  }
  
  // Define shared dependency configuration
  export interface SharedConfig {
    // Whether this should be a singleton
    singleton?: boolean;
    // Whether the shared module should be eagerly loaded
    eager?: boolean;
    // The required version of the shared module
    requiredVersion?: string;
    // Whether to strictly enforce the required version
    strictVersion?: boolean;
    // The actual version of the shared module
    version?: string;
  }
}

// Add global federation types
declare global {
  interface Window {
    // For Webpack Module Federation
    __webpack_init_sharing__?: (scope: string) => Promise<void>;
    __webpack_share_scopes__?: Record<string, any>;
    
    // For Vite Module Federation
    __federation_shared__?: Record<string, any>;
    
    // For both Webpack and Vite Module Federation
    [key: string]: any;
  }
  
  // For Vite Module Federation dynamic imports
  interface ImportMeta {
    glob: (pattern: string) => Record<string, () => Promise<any>>;
  }
}

// Types for dynamically imported modules
interface RemoteContainer {
  get: (module: string) => Promise<Factory>;
  init?: (shared: Record<string, any>) => void;
}

type Factory = () => Promise<any>;

// Export these types for use in other files
export { FederationOptions, SharedConfig, RemoteContainer, Factory };