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
    const [loading, setLoading] = useState<boolean>(true);
    const [isReady, setIsReady] = useState<boolean>(false); // Initialize readiness to false
    const [error, setError] = useState<string | null>(null);

// Inside ShellConfigContext.tsx

    const fetchConfig = async () => {
        console.log("ShellConfigContext: fetchConfig function CALLED.");
        setLoading(true);
        setIsReady(false);
        setError(null);
        const effectivePrefsServiceUrl = import.meta.env.VITE_PREFS_SERVICE_URL || 'http://localhost:8011';
        setPrefsServiceUrl(effectivePrefsServiceUrl);
        const configFetcher = axios.create({ baseURL: effectivePrefsServiceUrl });

        try {
            console.log(`ShellConfigContext: Attempting to fetch config from: ${effectivePrefsServiceUrl}/api/v1/shell/configuration`);
            const response = await configFetcher.get<ShellConfigurationResponse>('/api/v1/shell/configuration');
            const data = response.data;

            // *** ADD LOGGING HERE ***
            console.log("ShellConfigContext: Raw config response RECEIVED:", JSON.stringify(data, null, 2)); // Log raw response

            setConfig(data?.preferences ?? { frames: data?.frames ?? [] });
            setAvailableApps(data?.availableApps ?? null);

            // --- Configure shared apiService ---
            const backendUrl = data?.serviceEndpoints?.jobConfigServiceUrl; // Extract URL

            // *** ADD LOGGING HERE ***
            console.log(`ShellConfigContext: Extracted jobConfigServiceUrl: ${backendUrl}`); // Log extracted URL
            console.log(`ShellConfigContext: Type of backendUrl: ${typeof backendUrl}`); // Log its type

            if (backendUrl && typeof backendUrl === 'string') {
                // *** ADD LOGGING HERE ***
                console.log(`ShellConfigContext: Condition PASSED. Preparing to call configureApiService with URL: ${backendUrl}`);
                configureApiService(backendUrl); // Call the configuration function
                // *** ADD LOGGING HERE ***
                console.log(`ShellConfigContext: configureApiService was CALLED.`);

                console.log("ShellConfigContext: Publishing shell:config:ready event.");
                eventBus.publish(EventTypes.SHELL_CONFIG_READY, {
                    source: 'ShellConfigContext',
                    payload: { backendUrl: backendUrl }
                });
            } else {
                // *** ADD LOGGING HERE ***
                console.warn(`ShellConfigContext: Condition FAILED. jobConfigServiceUrl not found or invalid in response. apiService MAY NOT be configured correctly.`);
                // Optionally, still mark as ready but log the warning prominently.
                // setIsReady(true); // Or decide if readiness depends on this specific URL
            }
            // --- End Configuration ---

            // Clear error if fetch succeeded AFTER potential previous errors
            setError(null); // <-- Ensure error is cleared on success

        } catch (err: any) {
            // ... existing error handling ...
            console.error("ShellConfigContext: Error fetching shell configuration:", err);
            let errorMessage = "Failed to fetch configuration.";
            // ... (keep existing detailed error message logic) ...
            setError(errorMessage);
            setConfig(null);
            setAvailableApps(null);
            // Ensure readiness is false on error
            setIsReady(false); // <-- Explicitly set ready to false on error

        } finally {
            // *** Modify This Logic Slightly ***
            // Set ready to true ONLY if the fetch succeeded AND configureApiService was intended to be called and likely succeeded
            // We check !error which indicates the try block completed without throwing.
            setIsReady(!error); // Set ready based on whether an error occurred during the fetch/config process.
            console.log(`ShellConfigContext: fetchConfig finally block. Setting isReady to: ${!error}`);

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
        isReady, // Provide isReady in the context value
        fetchConfig
    }), [config, loading, error, availableApps, prefsServiceUrl, isReady]); // Add isReady dependency

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