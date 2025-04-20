// File: packages/shell/src/contexts/ShellConfigContext.tsx
import React, {
  createContext, useContext, useState, useEffect, ReactNode, useCallback
} from 'react';
import axios from 'axios';
// Import necessary types and functions
import { configureApiService, ShellConfigurationResponse } from 'shared'; // Added ServiceEndpoints
import { defaultShellConfiguration } from '../config/defaults';

// --- Define Context State ---
interface ShellConfigContextState {
config: ShellConfigurationResponse | null;
loading: boolean;
error: string | null;
fetchConfig: () => Promise<void>;
prefsServiceUrl: string; // <-- ADDED: URL for the preferences service
}

// --- Get Prefs Service URL (using correct fallback) ---
const PREFERENCES_SERVICE_URL =
import.meta.env.VITE_PREFS_SERVICE_URL || 'http://localhost:8010'; // Use 8010 fallback

// Axios instance specifically for fetching initial config from Prefs service
const configFetcher = axios.create({ baseURL: PREFERENCES_SERVICE_URL });

// --- Define Default Context Value ---
const defaultContextValue: ShellConfigContextState = {
  config: null,
  loading: true,
  error: null,
  fetchConfig: async () => {},
  prefsServiceUrl: PREFERENCES_SERVICE_URL // <-- ADDED: Use the determined URL
};

const ShellConfigContext = createContext<ShellConfigContextState>(defaultContextValue);


export const ShellConfigProvider: React.FC<ShellConfigProviderProps> = ({ children }) => {
const [config, setConfig] = useState<ShellConfigurationResponse | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
// The prefs URL is now determined outside and passed in context value
const prefsServiceUrl = PREFERENCES_SERVICE_URL;

const fetchConfig = useCallback(async () => {
  setLoading(true);
  setError(null);
  console.log(`ShellConfigContext: Attempting to fetch shell configuration from ${prefsServiceUrl}/api/v1/shell/configuration`);
  try {
      const response = await configFetcher.get<ShellConfigurationResponse>('/api/v1/shell/configuration');
      if (response.data) {
          console.log('ShellConfigContext: Received config:', JSON.stringify(response.data, null, 2));
          setConfig(response.data);
          const backendUrl = response.data.serviceEndpoints?.jobConfigServiceUrl;
          console.log(`ShellConfigContext: Configuring apiService with backend URL: ${backendUrl}`);
          configureApiService(backendUrl); // Configure the main apiService
      } else {
          throw new Error('Received empty response from configuration service');
      }
  } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch shell configuration';
      console.error('ShellConfigContext: Error fetching config, falling back to defaults.', err);
      setError(errorMessage + `. Falling back to default configuration.`);
      const fallbackConfig = defaultShellConfiguration as ShellConfigurationResponse; // Cast if needed
      setConfig(fallbackConfig);
      const defaultBackendUrl = fallbackConfig.serviceEndpoints?.jobConfigServiceUrl;
      console.log(`ShellConfigContext: Configuring apiService with DEFAULT backend URL: ${defaultBackendUrl}`);
      configureApiService(defaultBackendUrl);
  } finally {
      setLoading(false);
  }
}, [prefsServiceUrl]); // Depend on prefsServiceUrl

useEffect(() => {
    fetchConfig();
}, [fetchConfig]);

// --- Provide the Prefs URL in the context value ---
const contextValue: ShellConfigContextState = {
  config,
  loading,
  error,
  fetchConfig,
  prefsServiceUrl // <-- Provide it here
};

return (
  <ShellConfigContext.Provider value={contextValue}>
    {children}
  </ShellConfigContext.Provider>
);
};

// --- Hook remains the same ---
export const useShellConfig = (): ShellConfigContextState => {
const context = useContext(ShellConfigContext);
if (context === undefined) {
  throw new Error('useShellConfig must be used within a ShellConfigProvider');
}
return context;
};

// Define ShellConfigProviderProps if not already defined or imported
interface ShellConfigProviderProps {
children: ReactNode;
}