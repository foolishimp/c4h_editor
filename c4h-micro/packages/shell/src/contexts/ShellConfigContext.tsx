// File: /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/shell/src/contexts/ShellConfigContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import axios from 'axios';
// Import types and values correctly from shared package
import {
    AppDefinition, Preferences, ShellConfigurationResponse, LayoutDefinition,
    eventBus, EventTypes, configureApiService, checkApiServiceReady // EventTypes is now exported as value
} from 'shared';

// Define the shape of the context state
export interface ShellConfigContextState {
    config: Preferences | null;
    loading: boolean;
    error: string | null;
    availableApps: AppDefinition[] | null;
    layouts: Record<string, LayoutDefinition> | null;
    prefsServiceUrl: string | null;
    isReady: boolean;
    fetchConfig: () => Promise<void>;
    fetchLayout: (layoutId: string) => Promise<LayoutDefinition | null>;
}

const ShellConfigContext = createContext<ShellConfigContextState | undefined>(undefined);

interface ShellConfigProviderProps {
    children: ReactNode;
}

export const ShellConfigProvider: React.FC<ShellConfigProviderProps> = ({ children }) => {
    const [config, setConfig] = useState<Preferences | null>(null);
    const [availableApps, setAvailableApps] = useState<AppDefinition[] | null>(null);
    const [prefsServiceUrl, setPrefsServiceUrl] = useState<string | null>(null);
    const [layouts, setLayouts] = useState<Record<string, LayoutDefinition> | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isReady, setIsReady] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = useCallback(async () => {
        console.log("!!! ShellConfigContext: fetchConfig START !!!");
        setLoading(true); setIsReady(false); setError(null);
        let configurationSuccessful = false;
        const effectivePrefsServiceUrl = import.meta.env.VITE_PREFS_SERVICE_URL || 'http://localhost:8011';
        setPrefsServiceUrl(effectivePrefsServiceUrl);
        const configFetcher = axios.create({ baseURL: effectivePrefsServiceUrl });

        try {
            const response = await configFetcher.get<ShellConfigurationResponse>('/api/v1/shell/configuration');
            const data = response.data;
            console.log("ShellConfigContext: Raw config response:", data ? JSON.stringify(data).substring(0, 500) + '...' : 'null');

            const fetchedFrames = data?.preferences?.frames ?? data?.frames ?? [];
            setConfig({ frames: fetchedFrames });
            setAvailableApps(data?.availableApps ?? null);
            setLayouts({});  // Initialize an empty layouts object

            const backendUrl = data?.serviceEndpoints?.jobConfigServiceUrl;
            if (backendUrl && typeof backendUrl === 'string') {
                configureApiService(backendUrl);
                configurationSuccessful = true;
                // Use the EventTypes enum value correctly
                eventBus.publish(EventTypes.SHELL_CONFIG_READY, { // FIXED
                    source: "ShellConfigContext",
                    payload: { backendUrl: backendUrl }
                });
            } else {
                console.warn(`ShellConfigContext: jobConfigServiceUrl not found/invalid. apiService not configured.`);
            }
            setError(null);
        } catch (err: any) {
            // ... (error handling as before) ...
             console.error("!!! ShellConfigContext: ERROR during fetchConfig !!!", err.message || err);
             let errorMessage = "Failed to fetch shell configuration.";
             if (axios.isAxiosError(err)) {
                 errorMessage = err.response?.data?.detail || err.message || errorMessage;
                 if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
                      errorMessage = `Network error connecting to preferences service at ${effectivePrefsServiceUrl}. Is it running?`;
                 }
             } else if (err instanceof Error) {
                 errorMessage = err.message;
             }
             setError(errorMessage);
             setConfig(null); setAvailableApps(null); setLayouts(null);
        } finally {
            setIsReady(configurationSuccessful);
            console.log(`ShellConfigContext: fetchConfig finally. configurationSuccessful=${configurationSuccessful}. isReady=${configurationSuccessful}`);
            setLoading(false);
        }
    }, []);

    // Add a new function to fetch a specific layout
    const fetchLayout = useCallback(async (layoutId: string): Promise<LayoutDefinition | null> => {
        if (!prefsServiceUrl) {
            console.error("Cannot fetch layout: prefsServiceUrl is not set");
            return null;
        }

        // If we already have this layout, return it
        if (layouts && layouts[layoutId]) {
            console.log(`ShellConfigContext: Using cached layout ${layoutId}`);
            return layouts[layoutId];
        }

        console.log(`ShellConfigContext: Fetching layout ${layoutId} from ${prefsServiceUrl}/api/v1/shell/layouts/${layoutId}`);
        try {
            const response = await axios.get<LayoutDefinition>(`${prefsServiceUrl}/api/v1/shell/layouts/${layoutId}`);
            const layoutDefinition = response.data;
            
            console.log(`ShellConfigContext: Successfully fetched layout ${layoutId}`);
            
            // Update the layouts state with this layout
            setLayouts(prev => {
                const updatedLayouts = { ...(prev || {}) };
                updatedLayouts[layoutId] = layoutDefinition;
                return updatedLayouts;
            });
            
            return layoutDefinition;
        } catch (err) {
            console.error(`ShellConfigContext: Error fetching layout ${layoutId}:`, err);
            return null;
        }
    }, [prefsServiceUrl, layouts]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const contextValue = useMemo(() => ({
        config, loading, error, availableApps, layouts, prefsServiceUrl, isReady, fetchConfig, fetchLayout
    }), [config, loading, error, availableApps, layouts, prefsServiceUrl, isReady, fetchConfig, fetchLayout]);

    return (
        <ShellConfigContext.Provider value={contextValue}>
            {children}
        </ShellConfigContext.Provider>
    );
};

export const useShellConfig = (): ShellConfigContextState => {
    const context = useContext(ShellConfigContext);
    if (context === undefined) throw new Error('useShellConfig must be used within a ShellConfigProvider');
    return context;
};