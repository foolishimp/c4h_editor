import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios'; // Keep axios import for isAxiosError check
import { AppDefinition, Preferences, ShellConfigurationResponse, LayoutDefinition, 
         eventBus, EventTypes } from 'shared'; // Updated imports to include LayoutDefinition
import { configureApiService } from 'shared'; // Removed apiService import as it's not directly used here

// Define the shape of the context state
export interface ShellConfigContextState {
    config: Preferences | null;
    loading: boolean;
    error: string | null;
    availableApps: AppDefinition[] | null;
    layouts: LayoutDefinition[] | null;
    prefsServiceUrl: string | null;
    isReady: boolean; // Flag indicating config fetch and API setup is complete
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
    const [layouts, setLayouts] = useState<LayoutDefinition[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isReady, setIsReady] = useState<boolean>(false); // Initialize readiness to false
    const [error, setError] = useState<string | null>(null);

    // Inside ShellConfigContext.tsx
    const fetchConfig = async () => {
        console.log("!!! ShellConfigContext: useEffect[] calling fetchConfig !!!"); // Moved log here
        console.log("!!! ShellConfigContext: fetchConfig START !!!");
        setLoading(true);
        setIsReady(false); // Ensure ready is false at the start
        setError(null);
        let configurationSuccessful = false; // <<< NEW FLAG

        const effectivePrefsServiceUrl = import.meta.env.VITE_PREFS_SERVICE_URL || 'http://localhost:8011';
        setPrefsServiceUrl(effectivePrefsServiceUrl);
        const configFetcher = axios.create({ baseURL: effectivePrefsServiceUrl });

        try {
            console.log(`ShellConfigContext: Preparing to GET from: ${effectivePrefsServiceUrl}/api/v1/shell/configuration`);
            const response = await configFetcher.get<ShellConfigurationResponse>('/api/v1/shell/configuration');
            console.log("ShellConfigContext: GET call SUCCEEDED.");
            const data = response.data;
            console.log("ShellConfigContext: Raw config response RECEIVED:", JSON.stringify(data, null, 2));

            setConfig(data?.preferences ?? { frames: data?.frames ?? [] });
            setAvailableApps(data?.availableApps ?? null);
            
            // Set layout definitions from the API response
            setLayouts(data?.layouts ?? null);
            console.log("ShellConfigContext: Received layout definitions:", data?.layouts);

            const backendUrl = data?.serviceEndpoints?.jobConfigServiceUrl;
            console.log(`ShellConfigContext: Extracted jobConfigServiceUrl: ${backendUrl}`);
            console.log(`ShellConfigContext: Type of backendUrl: ${typeof backendUrl}`);

            if (backendUrl && typeof backendUrl === 'string') {
                console.log(`ShellConfigContext: Condition PASSED. Preparing to call configureApiService with URL: ${backendUrl}`);
                configureApiService(backendUrl);
                console.log(`ShellConfigContext: configureApiService was CALLED.`);
                configurationSuccessful = true; // <<< SET FLAG TO TRUE

                console.log("ShellConfigContext: Publishing shell:config:ready event.");
                eventBus.publish(EventTypes.SHELL_CONFIG_READY, { 
                    source: "ShellConfigContext", 
                    payload: { backendUrl: backendUrl }
                });
            } else {
                console.warn(`ShellConfigContext: Condition FAILED. jobConfigServiceUrl not found or invalid. apiService MAY NOT be configured correctly.`);
                // configurationSuccessful remains false
            }
            setError(null); // Clear error on success

        } catch (err: any) {
            console.error("!!! ShellConfigContext: ERROR during fetchConfig try block !!!", err.message || err);
            let errorMessage = "Failed to fetch configuration.";
            if (axios.isAxiosError(err)) { // Make sure axios is imported if using isAxiosError
                errorMessage = err.response?.data?.detail || err.message || errorMessage;
                if(err.response?.status === 404) { /* ... */ }
                else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') { /* ... */ }
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            setConfig(null);
            setAvailableApps(null);
            setLayouts(null); // Clear layouts on error
            // configurationSuccessful remains false

        } finally {
            // <<< MODIFIED LOGIC >>>
            // Set ready ONLY if the configuration step was successful
            setIsReady(configurationSuccessful);
            console.log(`ShellConfigContext: fetchConfig finally block. configurationSuccessful=${configurationSuccessful}. Setting isReady to: ${configurationSuccessful}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log("!!! ShellConfigContext: useEffect[] calling fetchConfig !!!"); // <-- ADD THIS    
        fetchConfig();
    }, []); // Fetch on initial mount

    // Memoize the context value
    const contextValue = React.useMemo(() => ({
        config,
        loading,
        error,
        availableApps,
        layouts,
        prefsServiceUrl,
        isReady, // Provide isReady in the context value
        fetchConfig
    }), [config, loading, error, availableApps, layouts, prefsServiceUrl, isReady]); // Add layouts to dependencies

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