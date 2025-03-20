// File: c4h-micro/packages/shared/src/types/federation.d.ts
declare module '@originjs/vite-plugin-federation' {
    // Define the function export
    export default function federation(options: FederationOptions): any;
    
    // Define the options interface
    export interface FederationOptions {
      name?: string;
      filename?: string;
      exposes?: Record<string, string>;
      remotes?: Record<string, string>;
      shared?: Record<string, SharedConfig | boolean>;
      // Add any other options used in your configurations
    }
    
    export interface SharedConfig {
      singleton?: boolean;
      eager?: boolean;
      requiredVersion?: string;
      strictVersion?: boolean;
      version?: string;
    }
  }