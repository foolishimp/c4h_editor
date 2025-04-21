// File: packages/shell/src/contexts/ShellConfigContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { AppDefinition, FrameDefinition, Preferences, ShellConfigurationResponse } from 'shared'; // Using correct imports
import { configureApiService } from 'shared'; // Import configuration function

// Define the shape of the context state
// Add 'export' here to make it available for import in App.tsx
export interface ShellConfigContextState {
    config: Preferences | null;
    loading: boolean;
    error: string | null;
    availableApps: AppDefinition[] | null; // Add availableApps here
    prefsServiceUrl: string | null;       // Add prefsServiceUrl here
    fetchConfig: () => Promise<void>;
}

// Create the context with a default undefined value
const ShellConfigContext = createContext<ShellConfigContextState | undefined>(undefined);

// Define the provider component props
interface ShellConfigProviderProps {
    children: ReactNode;
}

// Create the provider component
export const ShellConfigProvider: React.FC<ShellConfigProviderProps> = ({ children }) => {
    const [config, setConfig] = useState<Preferences | null>(null);
    const [availableApps, setAvailableApps] = useState<AppDefinition[] | null>(null);
    const [prefsServiceUrl, setPrefsServiceUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = async () => {
        setLoading(true);
        setError(null);
        // Default Prefs Service URL - could be overridden by env var
        const effectivePrefsServiceUrl = import.meta.env.VITE_PREFS_SERVICE_URL || 'http://localhost:8001';
        setPrefsServiceUrl(effectivePrefsServiceUrl); // Store the URL used

        // Create a dedicated axios instance for fetching config
        const configFetcher = axios.create({ baseURL: effectivePrefsServiceUrl });

        try {
            console.log(`Fetching shell configuration from: ${effectivePrefsServiceUrl}/api/v1/shell/configuration`);
            const response = await configFetcher.get<ShellConfigurationResponse>('/api/v1/shell/configuration');
            const data = response.data;

            console.log("Shell configuration received:", data);

            // Set state based on fetched data (fall back to frames if preferences missing)
            setConfig(data.preferences || { frames: data.frames || [] });
            setAvailableApps(data.availableApps); // Store available apps

            // Configure the shared apiService with the main backend URL
            if (data.mainBackendUrl || data.serviceEndpoints?.jobConfigServiceUrl) {
                configureApiService(data.mainBackendUrl || data.serviceEndpoints?.jobConfigServiceUrl);
                console.log(`Shared apiService configured with base URL: ${data.mainBackendUrl}`);
            } else {
                console.warn("Main backend URL not provided in shell configuration.");
                // Optionally configure with a default/fallback URL if needed
                // configureApiService('http://localhost:8000'); // Example fallback
            }

        } catch (err: any) {
            console.error("Error fetching shell configuration:", err);
            let errorMessage = "Failed to fetch configuration.";
            if (axios.isAxiosError(err)) {
                 errorMessage = err.response?.data?.detail || err.message || errorMessage;
                 // Handle specific status codes if needed
                 if(err.response?.status === 404) {
                     errorMessage = `Configuration endpoint not found at ${effectivePrefsServiceUrl}/api/v1/shell/configuration. Is the preferences service running?`;
                 }
            } else if (err instanceof Error) {
                 errorMessage = err.message;
            }
            setError(errorMessage);
            // Fallback to default preferences on error? Or show error state?
            // setConfig(DEFAULT_PREFERENCES); // Consider fallback strategy
            setConfig(null); // Or set to null to indicate failure
            setAvailableApps(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []); // Fetch on initial mount

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = React.useMemo(() => ({
        config,
        loading,
        error,
        availableApps, // Provide availableApps
        prefsServiceUrl, // Provide prefsServiceUrl
        fetchConfig
    }), [config, loading, error, availableApps, prefsServiceUrl]);

    return (
        <ShellConfigContext.Provider value={contextValue}>
            {children}
        </ShellConfigContext.Provider>
    );
};

// Custom hook to use the shell config context
export const useShellConfig = (): ShellConfigContextState => {
    const context = useContext(ShellConfigContext);
    if (context === undefined) {
        throw new Error('useShellConfig must be used within a ShellConfigProvider');
    }
    return context;
};