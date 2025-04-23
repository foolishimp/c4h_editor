/**
 * /packages/shell/src/App.tsx
 * Main shell application that orchestrates microfrontends
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import {
    ThemeProvider,
    CssBaseline,
    Box,
    CircularProgress,
    IconButton,
    Typography,
    AppBar,
    Toolbar,
} from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import { useShellConfig, ShellConfigProvider } from './contexts/ShellConfigContext';
import TabBar from './components/layout/TabBar';
// Ensure all needed types/values are imported from shared (including configTypes)
import { AppAssignment, AppDefinition, eventBus, EventTypes, MFEType, configTypes } from 'shared';
import { setupEventBusBridge } from './utils/eventBusBridge';
import PreferencesDialog from './components/preferences/PreferencesDialog';

// Theme definition
const theme = createTheme({
    palette: {
        primary: { main: '#1976d2' }, //
        secondary: { main: '#dc004e' },
        background: { default: '#f5f7fa' },
    },
    typography: {
        fontFamily: [
            '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif',
        ].join(','),
    },
    
});

class ErrorBoundary extends React.Component<{ children: React.ReactNode, message?: string }, { hasError: boolean, error: any }> {
   constructor(props: { children: React.ReactNode, message?: string }) {
     super(props);
     this.state = { hasError: false, error: null };
   }
   static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
   componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { console.error("ErrorBoundary caught:", error, errorInfo); }
   render() {
     if (this.state.hasError) {
       return (
         <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
           <h2>{this.props.message || 'Something went wrong'}</h2>
           <p>There was an error loading this part of the application.</p>
           <details style={{ whiteSpace: 'pre-wrap', marginTop: '1em', textAlign: 'left' }}>
             <summary>Error Details</summary>
             {this.state.error?.toString()}
           </details>
           <button onClick={() => this.setState({ hasError: false, error: null })}>Try again</button>
           {' '}
           <button onClick={() => window.location.reload()}>Reload Page</button>
         </Box>
       );
     }
     return this.props.children;
   }
}

function AppContent() {
    const { config, loading, error, availableApps } = useShellConfig();
    const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
    const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
    const [isPrefsDialogOpen, setIsPrefsDialogOpen] = useState<boolean>(false);
    const mountedModulesRef = useRef<Record<string, { unmount: () => void }>>({});
    const isMountedRef = useRef(true);
    const mfeContainerRef = useRef<HTMLDivElement | null>(null);
    const previousActiveFrameIdRef = useRef<string | null>(null);

    // Set up event bus bridge for iframe communication
    useEffect(() => {
        const bridge = setupEventBusBridge(window);
        return () => bridge.tearDown();
    }, []);

    // Effect to handle component unmount cleanup
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            console.log("AppContent unmounting. Cleaning up all mounted modules.");
            Object.entries(mountedModulesRef.current).forEach(([frameId, moduleInstance]) => {
                console.log(`AppContent unmount: Cleaning up module for frame ${frameId}`);
                if (moduleInstance?.unmount) { // Check if unmount exists
                    try { moduleInstance.unmount(); } catch (e) { console.error(`Error unmounting ${frameId} on AppContent cleanup:`, e); }
                }
            });
            mountedModulesRef.current = {};
        };
    }, []);

    // Preferences dialog handlers
    const handleOpenPrefsDialog = useCallback(() => setIsPrefsDialogOpen(true), []);
    const handleClosePrefsDialog = useCallback(() => setIsPrefsDialogOpen(false), []);

    // Helper function to load a specific app into a frame
    const loadFrame = useCallback((frameId: string, appId: string) => {
        console.log(`Shell: loadFrame helper called for frame ${frameId}, app ${appId}`);
        const appDef = availableApps?.find(app => app.id === appId);
        if (!appDef) {
            console.error(`Shell: App ${appId} not found in availableApps`);
            return;
        }
        if (activeFrameId !== frameId) {
            setActiveFrameId(frameId);
        }
    }, [availableApps, activeFrameId]); // Dependency on activeFrameId removed as setActiveFrameId is stable

    // Effect to manage activeFrameId based on loaded config
    useEffect(() => {
        if (!loading && !error && config?.frames) {
            const sortedFrames = [...config.frames].sort((a, b) => a.order - b.order);
            const currentFrameIsValid = activeFrameId ? sortedFrames.some(f => f.id === activeFrameId) : false;

            if (sortedFrames.length > 0) {
                 // Set initial frame only if none is active or the current one is no longer valid
                if ((!activeFrameId || !currentFrameIsValid) && isMountedRef.current) {
                    setActiveFrameId(sortedFrames[0].id);
                }
            } else if (activeFrameId !== null && isMountedRef.current) {
                // No frames configured, clear active frame
                setActiveFrameId(null);
            }
        } else if (!loading && !error && !config?.frames && activeFrameId !== null && isMountedRef.current) {
             // Config loaded but has no frames array, clear active frame
            setActiveFrameId(null);
        }
    // Depend only on external data influencing the logic
    }, [config, loading, error, activeFrameId]);

    // Effect for cleaning up the previous MFE when activeFrameId changes
    useEffect(() => {
        const frameIdToCleanUp = previousActiveFrameIdRef.current;
        const currentFrameId = activeFrameId; // Capture current value
        previousActiveFrameIdRef.current = currentFrameId; // Update ref for next run

        if (frameIdToCleanUp && frameIdToCleanUp !== currentFrameId) {
            const moduleToUnmount = mountedModulesRef.current[frameIdToCleanUp];
            if (moduleToUnmount?.unmount) {
                console.log(`App.tsx: Cleanup Effect - Scheduling unmount for previous frame: ${frameIdToCleanUp}`);
                // Use requestAnimationFrame for deferral to avoid potential conflicts
                requestAnimationFrame(() => {
                    // Double-check if the module hasn't been replaced in the meantime
                    if (mountedModulesRef.current[frameIdToCleanUp] === moduleToUnmount) {
                        console.log(`App.tsx: Cleanup Effect - Executing deferred unmount for ${frameIdToCleanUp}`);
                        try {
                            moduleToUnmount.unmount();
                        } catch (err) {
                            console.error(`App.tsx: Cleanup Effect - Error during deferred unmount for frame ${frameIdToCleanUp}:`, err);
                        }
                        // Clean up the reference *after* unmounting
                        delete mountedModulesRef.current[frameIdToCleanUp];
                        console.log(`App.tsx: Cleanup Effect - Removed ref for ${frameIdToCleanUp}`);
                    } else {
                        console.log(`App.tsx: Cleanup Effect - Module for ${frameIdToCleanUp} changed before deferred unmount could execute.`);
                        // If it changed, the new effect should handle its cleanup. We still remove the old ref.
                         delete mountedModulesRef.current[frameIdToCleanUp];
                    }
                });
            } else {
                // If no module or unmount function, just remove the reference
                console.log(`App.tsx: Cleanup Effect - No module or unmount function found for ${frameIdToCleanUp}, removing ref.`);
                delete mountedModulesRef.current[frameIdToCleanUp];
            }
        }
    }, [activeFrameId]); // Rerun only when activeFrameId changes


    // Handler for tab changes
    const handleTabChange = useCallback((_event: React.SyntheticEvent, newFrameId: string) => {
        console.log(`App.tsx: handleTabChange called. New frame ID: ${newFrameId}`);
        if (isMountedRef.current && newFrameId !== activeFrameId) {
            setActiveFrameId(newFrameId);
            setActiveConfigId(null); // Reset active config ID when changing tabs
        }
    }, [activeFrameId]); // Dependency on activeFrameId is correct here

    // Effect for mounting the current MFE
    useEffect(() => {
        let isEffectActive = true;
        const containerElement = mfeContainerRef.current;
        const currentFrameIdForMount = activeFrameId; // Capture frame ID for this effect instance

        console.log(`App.tsx: Mount Effect triggered. Frame ID: ${currentFrameIdForMount}, Container Element:`, containerElement);

        // --- Prerequisite Checks ---
        if (!containerElement) {
            console.log("App.tsx: Mount Effect - Skipping mount (Container element ref is not yet set).");
            return;
        }
         // **Fix for TS2538 START** Check if currentFrameIdForMount is valid before using as index
        if (currentFrameIdForMount === null) {
             console.log("App.tsx: Mount Effect - Skipping mount (activeFrameId is null).");
             containerElement.innerHTML = ''; // Clear container if no frame is active
             return;
        }
        // **Fix for TS2538 END**

        if (loading || error || !config || !availableApps) {
            console.log("App.tsx: Mount Effect - Skipping mount (Prerequisites not met: loading, error, no config, or no apps).");
            containerElement.innerHTML = ''; // Clear container
            const existingModule = mountedModulesRef.current[currentFrameIdForMount]; // Safe to index now
            if (existingModule?.unmount) {
                try { existingModule.unmount(); } catch(e) { console.error("Unmount error in prereq cleanup:", e); }
                delete mountedModulesRef.current[currentFrameIdForMount]; // Clean up ref
            }
            return;
        }

        // --- Find Frame and App Definition ---
        const activeFrame = config.frames?.find(f => f.id === currentFrameIdForMount);
        if (!activeFrame || !activeFrame.assignedApps || activeFrame.assignedApps.length === 0) {
            console.log(`App.tsx: Mount Effect - Skipping mount (Frame ${currentFrameIdForMount} invalid or no apps assigned).`);
            containerElement.innerHTML = '<div style="padding: 1em; font-style: italic;">Frame has no application assigned.</div>';
            const existingModule = mountedModulesRef.current[currentFrameIdForMount]; // Safe index
            if (existingModule?.unmount) {
                try { existingModule.unmount(); } catch(e) { console.error("Unmount error in invalid frame cleanup:", e); }
                delete mountedModulesRef.current[currentFrameIdForMount]; // Clean up ref
            }
            return;
        }

        const assignment: AppAssignment = activeFrame.assignedApps[0];
        const appDef = availableApps.find(app => app.id === assignment.appId);
        if (!appDef || !appDef.url) {
            console.error(`App.tsx: Mount Effect - Skipping mount (App definition or URL missing for ${assignment.appId}).`);
            containerElement.innerHTML = `<div style="color: red; padding: 1em;">Error: Cannot load app ${assignment.appId}. Definition or URL missing.</div>`;
            const existingModule = mountedModulesRef.current[currentFrameIdForMount]; // Safe index
            if (existingModule?.unmount) {
                try { existingModule.unmount(); } catch(e) { console.error("Unmount error in missing def cleanup:", e); }
                delete mountedModulesRef.current[currentFrameIdForMount]; // Clean up ref
            }
            return;
        }

        // --- Define Props ---
        const baseProps = {
            domElement: containerElement,
            appId: appDef.id
        };
        const customProps: Record<string, any> = {};
        // --- SIMPLIFIED LOGIC ---
        // Directly check if the appDef.id is a known config type key
        // Assuming 'configTypes' is imported from 'shared' or accessible here
        // (You might need to add the import: import { configTypes } from 'shared';)
        if (configTypes && configTypes.hasOwnProperty(appDef.id)) {
            // If it is, use the appId directly as the configType prop
            Object.assign(customProps, {
                configType: appDef.id, // e.g., 'teamconfig', 'workorder'
                configId: activeConfigId,
                onNavigateBack: () => setActiveConfigId(null),
                onNavigateTo: (id: string) => setActiveConfigId(id)
            });
            console.log(`App.tsx Mount Effect: Passing configType='${appDef.id}' as prop for ${appDef.id}`);
        }

        // --- Unmount Previous Module (Safety Check) ---
        const existingModule = mountedModulesRef.current[currentFrameIdForMount]; // Safe index
        if (existingModule?.unmount) {
            console.log(`App.tsx: Mount Effect - Unmounting existing module before mounting new one for frame ${currentFrameIdForMount}`);
            try { existingModule.unmount(); } catch(e) { console.error("Unmount error pre-mount:", e); }
        }
        // Clear container *after* potential unmount, *before* new mount attempt
        containerElement.innerHTML = '';


        // --- Mount Based on MFE Type ---

        // Handle iframe MFEs (TS2367 check is correct here based on MFEType)
        if (appDef.type === ('iframe' as MFEType)) {
            console.log(`App.tsx: Mount Effect - Creating iframe for app ${appDef.id} from ${appDef.url}`);
            const iframe = document.createElement('iframe');
            iframe.src = appDef.url;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.setAttribute('title', appDef.name || appDef.id);
            iframe.setAttribute('data-mfe-id', appDef.id);
            containerElement.appendChild(iframe);

            mountedModulesRef.current[currentFrameIdForMount] = {
                unmount: () => {
                    if (containerElement.contains(iframe)) {
                        console.log(`App.tsx: Unmounting iframe ${appDef.id}`);
                        containerElement.removeChild(iframe);
                    }
                }
            };
            return;
        }

        // Handle web component MFEs (TS2367 check is correct here based on MFEType)
        if (appDef.type === ('wc' as MFEType)) { 
            console.log(`App.tsx: Mount Effect - Creating web component for app ${appDef.id}`);
            const elementName = appDef.id.includes('-') ? appDef.id : `c4h-${appDef.id}`;
            try {
                const wcElement = document.createElement(elementName);
                Object.entries(baseProps).forEach(([key, value]) => {
                     if (key !== 'domElement') { if (typeof value === 'string') wcElement.setAttribute(key, value); else (wcElement as any)[key] = value; }
                });
                Object.entries(customProps).forEach(([key, value]) => { (wcElement as any)[key] = value; });
                containerElement.appendChild(wcElement);

                mountedModulesRef.current[currentFrameIdForMount] = {
                    unmount: () => {
                        if (containerElement.contains(wcElement)) {
                            console.log(`App.tsx: Unmounting web component ${elementName}`);
                            containerElement.removeChild(wcElement);
                        }
                    }
                };
            } catch (wcError) {
                 console.error(`App.tsx: Mount Effect - Error creating/mounting web component ${elementName}:`, wcError);
                 containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to create web component '${elementName}'. Is it registered?</div>`;
                 // Ensure ref is cleaned up on error
                 delete mountedModulesRef.current[currentFrameIdForMount];
            }
            return;
        }

        // Handle ESM MFEs
        console.log(`App.tsx: Mount Effect - Preparing to dynamically import ESM module for frame ${currentFrameIdForMount}, app ${appDef.id} from ${appDef.url}`);
        const loadingIndicator = document.createElement('div');
        loadingIndicator.style.padding = '1em';
        loadingIndicator.innerText = `Loading ${appDef.name}...`;
        containerElement.appendChild(loadingIndicator);

        import(/* @vite-ignore */ appDef.url).then(async module => {
             // Add check for currentFrameIdForMount consistency inside async callback
            if (!isEffectActive || activeFrameId !== currentFrameIdForMount || !containerElement.isConnected) {
                console.log(`App.tsx: Mount Effect - Aborting ESM mount for ${appDef.id}. Effect inactive, frame changed, or container disconnected.`);
                if (containerElement.contains(loadingIndicator)) { try { containerElement.removeChild(loadingIndicator); } catch (e) {} }
                return;
            }

            if (containerElement.contains(loadingIndicator)) { try { containerElement.removeChild(loadingIndicator); } catch (e) {} }
            console.log(`App.tsx: Mount Effect - ESM Module loaded for ${appDef.id}`, module);

            try {
                // Call bootstrap function if MFE supports it
                if (module.bootstrapMfe && typeof module.bootstrapMfe === 'function') {
                    console.log(`Shell: Calling bootstrapMfe for ${appDef.id}`);
                    try {
                        await module.bootstrapMfe(appDef.id);
                    } catch (bootstrapError) {
                        console.error(`Shell: Error bootstrapping MFE ${appDef.id}:`, bootstrapError);
                    }
                }
                
                let unmountFn: (() => void) | undefined = undefined;
                if (module.mount && typeof module.mount === 'function') {
                    console.log(`App.tsx: Mount Effect - Mounting ${appDef.id} via module.mount()...`);
                    const mountResult = module.mount({ ...baseProps, customProps });
                    const maybeUnmount = mountResult?.unmount || module.unmount;
                    if (typeof maybeUnmount === 'function') unmountFn = maybeUnmount;
                } else if (module.default && typeof module.default === 'function') {
                    console.log(`App.tsx: Mount Effect - Mounting ${appDef.id} as React component via ReactDOM...`);
                    const ReactComponent = module.default;
                    const root = ReactDOM.createRoot(containerElement);
                    root.render(<React.StrictMode><ReactComponent {...baseProps} {...customProps} /></React.StrictMode>);
                    unmountFn = () => {
                        console.log(`App.tsx: Unmount - Unmounting React component ${appDef.id} in frame ${currentFrameIdForMount}`);
                        try { root.unmount(); } catch (e) { console.error("Error during reactRoot.unmount:", e); }
                    };
                } else {
                    throw new Error("Module is not a valid ESM MFE (no mount function or default React component export).");
                }

                if (unmountFn) {
                    mountedModulesRef.current[currentFrameIdForMount] = { unmount: unmountFn };
                    console.log(`App.tsx: Mount Effect - Stored unmount function for ${currentFrameIdForMount}`);
                } else {
                    mountedModulesRef.current[currentFrameIdForMount] = { unmount: () => { console.warn(`No-op unmount called for ${currentFrameIdForMount}`); } };
                    console.warn(`App.tsx: Mount Effect - No valid unmount function found or stored for ${currentFrameIdForMount}`);
                }
            } catch (mountErr) {
                console.error(`App.tsx: Mount Effect - Error mounting/rendering ESM module ${appDef.id}:`, mountErr);
                containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to mount/render application. Check console.</div>`;
                delete mountedModulesRef.current[currentFrameIdForMount];
            }
        }).catch(importErr => {
             // Add check for currentFrameIdForMount consistency inside async callback
            if (!isEffectActive || activeFrameId !== currentFrameIdForMount) return;
            console.error(`App.tsx: Mount Effect - Error dynamically importing module ${appDef.id} from ${appDef.url}:`, importErr);
            if (containerElement.contains(loadingIndicator)) { try { containerElement.removeChild(loadingIndicator); } catch(e) {} }
            containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to load application module. Check console & network tab.</div>`;
            delete mountedModulesRef.current[currentFrameIdForMount];
        });

        // --- Effect Cleanup ---
        return () => {
            console.log(`App.tsx: Mount Effect - Cleanup executing for effect instance tied to frame ${currentFrameIdForMount}, app ${appDef?.id}`);
            isEffectActive = false;
        };
    }, [activeFrameId, availableApps, config, error, loading]);// Dependencies remain the same


    // Event bus listener for navigation requests
    useEffect(() => {
        const handleNavigationRequest = (detail: any) => {
            if (detail?.payload?.action) {
                const { action, target, from } = detail.payload;
                 console.log(`Shell received navigation request: Action=${action}, Target=${target}, From=${from || 'unknown'}`);
                 if (action === 'navigateTo' && target) {
                    setActiveConfigId(target);
                } else if (action === 'back') {
                    setActiveConfigId(null);
                }
            } else {
                 console.warn("Shell received navigation request with invalid payload:", detail);
            }
        };
        // **Fix for TS2304 START** Use EventTypes enum
        const unsubscribe = eventBus.subscribe(EventTypes.NAVIGATION_REQUEST, handleNavigationRequest);
        // **Fix for TS2304 END**
        return () => unsubscribe();
    }, []); // No dependencies needed

    // Event bus listener for in-place YAML editor requests
    useEffect(() => {
        const handleYamlEditorRequest = (detail: any) => {
            if (detail?.payload?.inPlace && detail.payload.configType && detail.payload.configId) {
                const { configType, configId, frameId: requestedFrameId, readOnly } = detail.payload;
                console.log(`Shell received request to load YAML Editor in-place for ${configType}:${configId}`);

                const yamlEditorApp = availableApps?.find(app => app.id === 'yaml-editor');
                if (!yamlEditorApp) { console.error("Shell: Cannot find yaml-editor in availableApps"); return; }

                const frameId = requestedFrameId || activeFrameId;
                if (!frameId) { console.error("Shell: No valid frame ID for yaml-editor mounting"); return; }

                const containerElement = document.getElementById(`mfe-container-${frameId}`);
                if (!containerElement) { console.error(`Shell: Cannot find container element for frame ${frameId}`); return; }

                const currentFrame = config?.frames?.find(f => f.id === frameId);
                const currentAppId = currentFrame?.assignedApps?.[0]?.appId;

                const currentModule = mountedModulesRef.current[frameId];
                if (currentModule?.unmount) {
                    try {
                        console.log(`Shell: Unmounting current app in frame ${frameId} to load yaml-editor`);
                        currentModule.unmount();
                    } catch (e) { console.error("Error unmounting current app:", e); }
                }
                delete mountedModulesRef.current[frameId]; // Remove ref after unmount attempt
                containerElement.innerHTML = ''; // Clear container

                console.log(`Shell: Loading yaml-editor from ${yamlEditorApp.url}`);
                import(/* @vite-ignore */ yamlEditorApp.url)
                    .then(module => {
                        if (!module || (!module.mount && !module.default)) { throw new Error("YAML Editor module invalid"); }
                        const mountFn = module.mount || ((props: any) => { /* ... default mount logic ... */ });
                        const yamlEditorProps = {
                            domElement: containerElement,
                            customProps: {
                                configType, configId, readOnly: readOnly || false,
                                onBack: () => {
                                     console.log(`Shell: YAML Editor back navigation, restoring ${currentAppId || 'nothing'}`);
                                     const yamlModule = mountedModulesRef.current[frameId];
                                     if (yamlModule?.unmount) { try { yamlModule.unmount(); } catch(e) {} delete mountedModulesRef.current[frameId]; }
                                     if (currentAppId) loadFrame(frameId, currentAppId); else containerElement.innerHTML = '';
                                }
                            }
                        };
                        try {
                            const mountedYamlEditor = mountFn(yamlEditorProps);
                            mountedModulesRef.current[frameId] = { unmount: mountedYamlEditor?.unmount || (() => {}) };
                        } catch (e) { /* ... error handling ... */ }
                    })
                    .catch(err => { /* ... error handling ... */ });
            }
        };
        console.log("Shell: Subscribing to config:edit:yaml event");
        const unsubscribe = eventBus.subscribe('config:edit:yaml', handleYamlEditorRequest);
        return () => { console.log("Shell: Unsubscribing from config:edit:yaml event"); unsubscribe(); };
    }, [availableApps, config?.frames, activeFrameId, loadFrame]); // Added loadFrame dependency


    // Helper function to render content
    const renderActiveFrameContent = () => {
        console.log(`App.tsx: renderActiveFrameContent rendering container div for activeFrameId: ${activeFrameId}`);
        if (loading) return <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
        if (error) return <Box sx={{ flexGrow: 1, p: 3 }}><Typography color="error">Error loading shell config: {error}</Typography></Box>;
        if (!config?.frames || config.frames.length === 0) return <Typography sx={{ p: 3, fontStyle: 'italic' }}>No frames configured. Open Preferences (gear icon) to add tabs.</Typography>;
        if (!activeFrameId) return <Typography sx={{ p: 3, fontStyle: 'italic' }}>Initializing or no frame selected...</Typography>;

        return (
            <ErrorBoundary message={`Error loading application for frame ${activeFrameId}`}>
                <div
                    ref={mfeContainerRef}
                    // *** THIS IS THE LINE TO CHANGE ***
                    // Only key by frame ID to prevent remount on internal navigation
                    key={activeFrameId}
                    // *** END OF CHANGE ***
                    id={`mfe-container-${activeFrameId}`}
                    style={{height: '100%', width: '100%', overflow: 'auto'}}
                />
            </ErrorBoundary>
        );
    };

    const verticalTabBarWidth = 200;

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'baseline' }}>
                        <Typography variant="h5" noWrap component="div" sx={{ mr: 2 }}>Visual Prompt Studio</Typography>
                        <Typography variant="subtitle1" noWrap component="div" sx={{ opacity: 0.8 }}>C4H Editor</Typography>
                    </Box>
                    <IconButton color="inherit" aria-label="open preferences" onClick={handleOpenPrefsDialog} edge="end">
                        <SettingsIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Box sx={{
                width: verticalTabBarWidth, flexShrink: 0, pt: `64px`, height: '100vh',
                boxSizing: 'border-box', borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper'
            }}>
                {!loading && !error && config?.frames && config.frames.length > 0 ? (
                    <TabBar frames={config.frames} activeFrameId={activeFrameId} onTabChange={handleTabChange} width={verticalTabBarWidth} />
                ) : (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        {loading && <CircularProgress sx={{mb: 1}} size={20}/>}
                        <Typography sx={{p:1, color: 'text.secondary', fontSize: '0.9rem'}}>{loading ? 'Loading Tabs...' : 'No Tabs'}</Typography>
                    </Box>
                )}
            </Box>

            <Box component="main" sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Toolbar />
                <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                    {renderActiveFrameContent()}
                </Box>
            </Box>

            <PreferencesDialog open={isPrefsDialogOpen} onClose={handleClosePrefsDialog} />
        </Box>
    );
}

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ShellConfigProvider>
                <Router>
                    <AppContent />
                </Router>
            </ShellConfigProvider>
        </ThemeProvider>
    );
}

export default App;