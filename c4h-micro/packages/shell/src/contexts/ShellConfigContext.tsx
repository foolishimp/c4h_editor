import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios'; // Keep axios import for isAxiosError check
import { AppDefinition, Preferences, ShellConfigurationResponse, eventBus, EventTypes } from 'shared'; // Added eventBus, EventTypes [cite: 414, 415, 466]
// Using correct imports
import { configureApiService } from 'shared'; // Removed apiService import as it's not directly used here

// Define the shape of the context state
export interface ShellConfigContextState {
    config: Preferences | null;
    loading: boolean;
    error: string | null;
    availableApps: AppDefinition[] | null;
    prefsServiceUrl: string | null;
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
        console.log("ShellConfigContext: fetchConfig function CALLED."); 

        setLoading(true);
        setError(null);
        // Default Prefs Service URL - *should* be overridden by env var VITE_PREFS_SERVICE_URL set by start_frontends.py
        const effectivePrefsServiceUrl = import.meta.env.VITE_PREFS_SERVICE_URL || 'http://localhost:8011'; // Corrected default port for prefs
        setPrefsServiceUrl(effectivePrefsServiceUrl); // Store the URL used

        // Create a dedicated axios instance for fetching config (safer than using shared one before it's configured)
        const configFetcher = axios.create({ baseURL: effectivePrefsServiceUrl });

        try {
            console.log(`ShellConfigContext: Attempting to fetch config from: ${effectivePrefsServiceUrl}/api/v1/shell/configuration`); // Log 1
            const response = await configFetcher.get<ShellConfigurationResponse>('/api/v1/shell/configuration');
            const data = response.data;

            console.log("ShellConfigContext: Raw config response received:", JSON.stringify(data, null, 2)); // Log 2: Raw response

            // Set state based on fetched data
            // Use optional chaining and nullish coalescing for safety
            setConfig(data?.preferences ?? { frames: data?.frames ?? [] });
            setAvailableApps(data?.availableApps ?? null);

            // --- Configure shared apiService ---
            const backendUrl = data?.serviceEndpoints?.jobConfigServiceUrl;
            console.log(`ShellConfigContext: Extracted jobConfigServiceUrl: ${backendUrl}`); // Log 3: Extracted URL

            if (backendUrl && typeof backendUrl === 'string') {
                console.log(`ShellConfigContext: Calling configureApiService with URL: ${backendUrl}`); // Log 4
                configureApiService(backendUrl);
                 // We can't easily log the *actual* current base URL of the shared instance from here
                 // without exporting it, but we log that we *attempted* the configuration.
                // --- ADD THIS ---
                // Publish event AFTER configuration is done
                console.log("ShellConfigContext: Publishing shell:config:ready event."); // <-- ADD THIS LOG
                eventBus.publish(EventTypes.SHELL_CONFIG_READY, { //
                    source: 'ShellConfigContext',
                    payload: { backendUrl: backendUrl }
                });
                // --- END ADD ---
                 console.log(`ShellConfigContext: configureApiService called.`);
            } else {
                console.warn("ShellConfigContext: jobConfigServiceUrl not found or invalid in response. apiService may use default or previously set URL.");
                // Log the default URL from apiService's perspective if possible, or just note the issue.
                 // console.warn(`ShellConfigContext: apiService base URL might remain: ${apiService.getBaseUrl()}`); // If you add a getter to apiService
            }
            // --- End Configuration ---

        } catch (err: any) {
            console.error("ShellConfigContext: Error fetching shell configuration:", err); // Log 6 (Error Detail)

            // --- FIX: Define errorMessage at the start of the catch block ---
            let errorMessage = "Failed to fetch configuration.";

            if (axios.isAxiosError(err)) {
                console.error("ShellConfigContext: Axios error details:", { status: err.response?.status, data: err.response?.data });
                 errorMessage = err.response?.data?.detail || err.message || errorMessage;
                 // Handle specific status codes if needed
                 if(err.response?.status === 404) {
                     errorMessage = `Configuration endpoint not found at ${effectivePrefsServiceUrl}/api/v1/shell/configuration. Is the preferences service (shell_service on :8011) running?`;
                 } else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
                     errorMessage = `Network error connecting to preferences service at ${effectivePrefsServiceUrl}. Is it running and accessible?`;
                 }
            } else if (err instanceof Error) {
                 errorMessage = err.message;
            }
            setError(errorMessage); // Use the defined variable
            setConfig(null);
            setAvailableApps(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []); // Fetch on initial mount

    // Memoize the context value
    const contextValue = React.useMemo(() => ({
        config,
        loading,
        error,
        availableApps,
        prefsServiceUrl,
        fetchConfig
    }), [config, loading, error, availableApps, prefsServiceUrl]);

    console.log("ShellConfigProvider: Value being provided by Context:", contextValue);
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