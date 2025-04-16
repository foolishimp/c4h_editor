import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios'; // Use separate axios instance for fetching config initially
import { configureApiService } from 'shared'; // Import the configuration function
import { ShellConfigurationResponse } from 'shared'; // Import the response type
import { defaultShellConfiguration } from '../config/defaults'; // Import defaults

interface ShellConfigContextState {
  config: ShellConfigurationResponse | null;
  loading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>; // Expose fetch function if needed
}

const ShellConfigContext = createContext<ShellConfigContextState | undefined>(undefined);

interface ShellConfigProviderProps {
  children: ReactNode;
}

// Determine the Preferences Service URL (adjust logic as needed)
const PREFERENCES_SERVICE_URL =
  typeof process !== 'undefined' && process.env.VITE_PREFERENCES_SERVICE_URL
    ? process.env.VITE_PREFERENCES_SERVICE_URL
    : 'http://localhost:8001'; // Default URL for the Preferences service itself

const configFetcher = axios.create({ baseURL: PREFERENCES_SERVICE_URL });

export const ShellConfigProvider: React.FC<ShellConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<ShellConfigurationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    console.log(`Attempting to fetch shell configuration from ${PREFERENCES_SERVICE_URL}/api/v1/shell/configuration`);
    try {
      const response = await configFetcher.get<ShellConfigurationResponse>('/api/v1/shell/configuration');
      if (response.data) {
        console.log('Shell configuration fetched successfully:', response.data);
        setConfig(response.data);
        // Dynamically configure the main apiService with the fetched Job/Config service URL
        configureApiService(response.data.serviceEndpoints?.jobConfigServiceUrl);
      } else {
        throw new Error('Received empty response from configuration service');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch shell configuration';
      console.error('Error fetching shell configuration:', errorMessage, err);
      setError(errorMessage + `. Falling back to default configuration.`);
      // Fallback to default configuration
      setConfig(defaultShellConfiguration);
      // Configure apiService with default backend URL on error
      configureApiService(defaultShellConfiguration.serviceEndpoints?.jobConfigServiceUrl);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch only on initial mount

  const contextValue: ShellConfigContextState = {
    config,
    loading,
    error,
    fetchConfig // Provide the function if manual refresh is needed
  };

  return (
    <ShellConfigContext.Provider value={contextValue}>
      {children}
    </ShellConfigContext.Provider>
  );
};

export const useShellConfig = (): ShellConfigContextState => {
  const context = useContext(ShellConfigContext);
  if (context === undefined) {
    throw new Error('useShellConfig must be used within a ShellConfigProvider');
  }
  return context;
};