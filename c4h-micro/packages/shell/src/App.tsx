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
import { AppAssignment, eventBus } from 'shared';
import PreferencesDialog from './components/preferences/PreferencesDialog';

// Theme definition
const theme = createTheme({
    palette: {
        primary: { main: '#1976d2' },
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

    // Effect to handle component unmount cleanup
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            console.log("AppContent unmounting. Cleaning up all mounted modules.");
            Object.entries(mountedModulesRef.current).forEach(([frameId, moduleInstance]) => {
                console.log(`AppContent unmount: Cleaning up module for frame ${frameId}`);
                if (moduleInstance && typeof moduleInstance.unmount === 'function') {
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
        
        // Find the app definition
        const appDef = availableApps?.find(app => app.id === appId);
        if (!appDef) {
            console.error(`Shell: App ${appId} not found in availableApps`);
            return;
        }
        
        // Set the active frame if needed
        if (activeFrameId !== frameId) {
            setActiveFrameId(frameId);
        }
        
        // The actual loading will be handled by the main mount effect
        // which watches for changes to activeFrameId
        
    }, [availableApps, activeFrameId, setActiveFrameId]);

    // Effect to manage activeFrameId based on loaded config
    useEffect(() => {
        if (!loading && !error && config?.frames) {
            const sortedFrames = [...config.frames].sort((a, b) => a.order - b.order);
            const currentFrameIsValid = activeFrameId ? sortedFrames.some(f => f.id === activeFrameId) : false;

            if (sortedFrames.length > 0) {
                if (!currentFrameIsValid) {
                    const newActiveId = sortedFrames[0].id;
                    console.log(`App.tsx: Setting active frame. New ID: ${newActiveId}`);
                    if (isMountedRef.current) setActiveFrameId(newActiveId);
                }
            } else if (activeFrameId !== null && isMountedRef.current) {
                setActiveFrameId(null);
            }
        } else if (!loading && !error && !config?.frames && activeFrameId !== null && isMountedRef.current) {
            setActiveFrameId(null);
        }
    }, [config?.frames, loading, error]);

    // Effect for cleaning up the previous MFE when activeFrameId changes
    useEffect(() => {
        const frameIdToCleanUp = previousActiveFrameIdRef.current;
        const currentFrameId = activeFrameId;
        previousActiveFrameIdRef.current = currentFrameId;

        if (frameIdToCleanUp && frameIdToCleanUp !== currentFrameId) {
            const moduleToUnmount = mountedModulesRef.current[frameIdToCleanUp];
            if (moduleToUnmount && typeof moduleToUnmount.unmount === 'function') {
                console.log(`App.tsx: Cleanup Effect - Scheduling unmount for previous frame: ${frameIdToCleanUp}`);
                requestAnimationFrame(() => {
                    if (mountedModulesRef.current[frameIdToCleanUp] === moduleToUnmount) {
                        console.log(`App.tsx: Cleanup Effect - Executing deferred unmount for ${frameIdToCleanUp}`);
                        try {
                            moduleToUnmount.unmount();
                        } catch (err) {
                            console.error(`App.tsx: Cleanup Effect - Error during deferred unmount for frame ${frameIdToCleanUp}:`, err);
                        }
                        delete mountedModulesRef.current[frameIdToCleanUp];
                        console.log(`App.tsx: Cleanup Effect - Removed ref for ${frameIdToCleanUp}`);
                    }
                });
            } else {
                delete mountedModulesRef.current[frameIdToCleanUp];
            }
        }
    }, [activeFrameId]);

    // Handler for tab changes
    const handleTabChange = useCallback((_event: React.SyntheticEvent, newFrameId: string) => {
        console.log(`App.tsx: handleTabChange called. New frame ID: ${newFrameId}`);
        if (isMountedRef.current && newFrameId !== activeFrameId) {
            setActiveFrameId(newFrameId);
            // Reset active config ID when changing tabs
            setActiveConfigId(null);
        }
    }, [activeFrameId]);

    // Effect for mounting the current MFE
    useEffect(() => {
        let isEffectActive = true;
        const containerElement = mfeContainerRef.current;

        console.log(`App.tsx: Mount Effect triggered. Frame ID: ${activeFrameId}, Container Element:`, containerElement);

        if (!containerElement) {
            console.log("App.tsx: Mount Effect - Skipping mount (Container element ref is not yet set).");
            return;
        }
        
        if (loading || error || !activeFrameId || !config || !availableApps) {
            console.log("App.tsx: Mount Effect - Skipping mount (Prerequisites not met).");
            containerElement.innerHTML = '';
            const existingModule = mountedModulesRef.current[activeFrameId!];
            if (existingModule) { 
                try { existingModule.unmount(); } catch(e) { console.error("Unmount error in prereq cleanup:", e); }
                delete mountedModulesRef.current[activeFrameId!]; 
            }
            return;
        }
        
        const activeFrame = config.frames?.find(f => f.id === activeFrameId);
        if (!activeFrame || !activeFrame.assignedApps || activeFrame.assignedApps.length === 0) {
            console.log("App.tsx: Mount Effect - Skipping mount (Active frame invalid or no apps assigned).");
            containerElement.innerHTML = '<div style="padding: 1em; font-style: italic;">Frame has no application assigned.</div>';
            const existingModule = mountedModulesRef.current[activeFrameId];
            if (existingModule) { 
                try { existingModule.unmount(); } catch(e) { console.error("Unmount error in invalid frame cleanup:", e); }
                delete mountedModulesRef.current[activeFrameId]; 
            }
            return;
        }
        
        const assignment: AppAssignment = activeFrame.assignedApps[0];
        const appDef = availableApps.find(app => app.id === assignment.appId);
        if (!appDef || !appDef.url) {
            console.error(`App.tsx: Mount Effect - Skipping mount (App definition or URL missing for ${assignment.appId}).`);
            containerElement.innerHTML = `<div style="color: red; padding: 1em;">Error: Cannot load app ${assignment.appId}. Definition or URL missing.</div>`;
            const existingModule = mountedModulesRef.current[activeFrameId];
            if (existingModule) { 
                try { existingModule.unmount(); } catch(e) { console.error("Unmount error in missing def cleanup:", e); }
                delete mountedModulesRef.current[activeFrameId]; 
            }
            return;
        }

        console.log(`App.tsx: Mount Effect - Preparing to load & mount module for frame ${activeFrameId}, app ${appDef.id} from ${appDef.url}`);
        containerElement.innerHTML = '';
        const loadingIndicator = document.createElement('div');
        loadingIndicator.style.padding = '1em'; 
        loadingIndicator.innerText = `Loading ${appDef.name}...`;
        containerElement.appendChild(loadingIndicator);
        const currentFrameIdForMount = activeFrameId;

        import(/* @vite-ignore */ appDef.url).then(module => {
            if (!isEffectActive || activeFrameId !== currentFrameIdForMount || !containerElement.isConnected) {
                console.log(`App.tsx: Mount Effect - Aborting mount for ${appDef.id}. Effect inactive, frame changed, or container disconnected.`);
                if (containerElement.contains(loadingIndicator)) {
                    try { containerElement.removeChild(loadingIndicator); } catch (e) {}
                }
                return;
            }
            
            if (containerElement.contains(loadingIndicator)) {
                try { containerElement.removeChild(loadingIndicator); } catch (e) {}
            }

            console.log(`App.tsx: Mount Effect - Module loaded for ${appDef.id}`, module);
            
            // Base props common to all modules
            const baseProps = { 
                domElement: containerElement,
                appId: appDef.id // Pass app ID for type detection
            };
            
            // Custom props with proper navigation handlers
            const customProps: Record<string, any> = {};
            
            // For config-selector MFEs, add navigation handlers and configId
            if (appDef.id.startsWith('config-selector-')) {
                const configTypeRaw = appDef.id.replace('config-selector-', '');
                // Convert plural to singular if needed
                const configType = configTypeRaw.endsWith('s') 
                    ? configTypeRaw.slice(0, -1) 
                    : configTypeRaw;
                
                Object.assign(customProps, {
                    configType,
                    configId: activeConfigId,
                    onNavigateBack: () => {
                        console.log(`Shell: MFE (${appDef.id}) requested navigation back.`);
                        // Clear the activeConfigId to return to list view
                        setActiveConfigId(null);
                    },
                    onNavigateTo: (id: string) => {
                        console.log(`Shell: MFE (${appDef.id}) requested navigation to config: ${id}`);
                        // Set the activeConfigId to navigate to detail view
                        setActiveConfigId(id);
                    }
                });
            }

            try {
                // Unmount any existing module for this frame ID
                const existingModule = mountedModulesRef.current[currentFrameIdForMount];
                if (existingModule) {
                    console.log(`App.tsx: Mount Effect - Unmounting existing module before mounting new one for frame ${currentFrameIdForMount}`);
                    if (typeof existingModule.unmount === 'function') { 
                        try { existingModule.unmount(); } catch(e) { console.error("Unmount error pre-mount:", e); } 
                    }
                    delete mountedModulesRef.current[currentFrameIdForMount];
                }

                let unmountFn: (() => void) | undefined = undefined;

                if (module.mount && typeof module.mount === 'function') {
                    console.log(`App.tsx: Mount Effect - Mounting ${appDef.id} via module.mount()...`);
                    const mountResult = module.mount({
                        ...baseProps,
                        customProps
                    });
                    const maybeUnmount = mountResult?.unmount || module.unmount;
                    if (typeof maybeUnmount === 'function') unmountFn = maybeUnmount;
                } else if (module.default && typeof module.default === 'function') {
                    console.log(`App.tsx: Mount Effect - Mounting ${appDef.id} as React component via ReactDOM...`);
                    const ReactComponent = module.default;
                    const root = ReactDOM.createRoot(containerElement);
                    root.render(
                        <React.StrictMode>
                            <ReactComponent {...baseProps} {...customProps} />
                        </React.StrictMode>
                    );
                    unmountFn = () => {
                        console.log(`App.tsx: Unmount - Unmounting React component ${appDef.id} in frame ${currentFrameIdForMount}`);
                        try { root.unmount(); } catch (e) { console.error("Error during reactRoot.unmount:", e); }
                    };
                } else {
                    throw new Error("Module is not a valid MFE (no mount function or default React component export).");
                }

                if (unmountFn) {
                    mountedModulesRef.current[currentFrameIdForMount] = { unmount: unmountFn };
                    console.log(`App.tsx: Mount Effect - Stored unmount function for ${currentFrameIdForMount}`);
                } else {
                    mountedModulesRef.current[currentFrameIdForMount] = { unmount: () => { console.warn(`No-op unmount called for ${currentFrameIdForMount}`); } };
                    console.warn(`App.tsx: Mount Effect - No valid unmount function found or stored for ${currentFrameIdForMount}`);
                }
            } catch (mountErr) {
                console.error(`App.tsx: Mount Effect - Error mounting/rendering module ${appDef.id}:`, mountErr);
                containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to mount/render application.</div>`;
                delete mountedModulesRef.current[currentFrameIdForMount];
            }
        }).catch(importErr => {
            if (!isEffectActive) return;
            console.error(`App.tsx: Mount Effect - Error dynamically importing module ${appDef.id} from ${appDef.url}:`, importErr);
            if (containerElement.contains(loadingIndicator)) {
                try { containerElement.removeChild(loadingIndicator); } catch(e) {}
            }
            containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to load application module. Check console & network tab.</div>`;
            delete mountedModulesRef.current[currentFrameIdForMount];
        });

        return () => {
            console.log(`App.tsx: Mount Effect - Cleanup executing for effect instance tied to frame ${currentFrameIdForMount}, app ${appDef?.id}`);
            isEffectActive = false;
        };
    }, [activeFrameId, activeConfigId, availableApps, config, error, loading]);

    // Event bus listener for navigation requests
    useEffect(() => {
        const handleNavigationRequest = (detail: any) => {
            if (detail.payload?.action === 'navigateTo' && detail.payload?.target) {
                console.log(`Shell received navigation request to: ${detail.payload.target}`);
                setActiveConfigId(detail.payload.target);
            } else if (detail.payload?.action === 'back') {
                console.log('Shell received navigation back request');
                setActiveConfigId(null);
            }
        };
        
        const unsubscribe = eventBus.subscribe('navigation:request', handleNavigationRequest);
        return () => unsubscribe();
    }, []);

    // Event bus listener for in-place YAML editor requests
    useEffect(() => {
        const handleYamlEditorRequest = (detail: any) => {
            if (detail?.payload?.inPlace && detail.payload.configType && detail.payload.configId) {
                console.log(`Shell received request to load YAML Editor in-place for ${detail.payload.configType}:${detail.payload.configId}`);
                
                // Find the yaml-editor app definition
                const yamlEditorApp = availableApps?.find(app => app.id === 'yaml-editor');
                if (!yamlEditorApp) {
                    console.error("Shell: Cannot find yaml-editor in availableApps");
                    return;
                }
                
                // Get the current frame ID from the event or use activeFrameId
                const frameId = detail.payload.frameId || activeFrameId;
                if (!frameId) {
                    console.error("Shell: No valid frame ID for yaml-editor mounting");
                    return;
                }
                
                // Store the current app info to restore later if needed
                const currentFrame = config?.frames?.find(f => f.id === frameId);
                const currentAppId = currentFrame?.assignedApps?.[0]?.appId;
                
                // We'll unmount the current app in this frame
                const currentModule = mountedModulesRef.current[frameId];
                if (currentModule?.unmount) {
                    try {
                        console.log(`Shell: Unmounting current app in frame ${frameId} to load yaml-editor`);
                        currentModule.unmount();
                    } catch (e) {
                        console.error("Error unmounting current app:", e);
                    }
                }
                
                // Get the container element to mount the YAML Editor
                const containerElement = document.getElementById(`mfe-container-${frameId}`);
                if (!containerElement) {
                    console.error(`Shell: Cannot find container element for frame ${frameId}`);
                    return;
                }
                
                // Clear the container
                containerElement.innerHTML = '';
                
                // Load and mount the YAML Editor
                console.log(`Shell: Loading yaml-editor from ${yamlEditorApp.url}`);
                import(/* @vite-ignore */ yamlEditorApp.url)
                    .then(module => {
                        if (!module.mount && !module.default) {
                            throw new Error("YAML Editor module doesn't export mount or default");
                        }
                        
                        const mountFn = module.mount || ((props: any) => {
                            const root = ReactDOM.createRoot(containerElement);
                            const Component = module.default;
                            root.render(<Component {...props} />);
                            return {
                                unmount: () => root.unmount()
                            };
                        });
                        
                        // Prepare props for YAML Editor
                        const yamlEditorProps = {
                            domElement: containerElement,
                            customProps: {
                                configType: detail.payload.configType,
                                configId: detail.payload.configId,
                                readOnly: detail.payload.readOnly || false,
                                onBack: () => {
                                    // When user clicks back in YAML Editor, restore original app
                                    console.log(`Shell: YAML Editor requested back navigation, restoring original app`);
                                    if (currentAppId) {
                                        // This will trigger the mount effect with the original app
                                        loadFrame(frameId, currentAppId);
                                    }
                                }
                            }
                        };
                        
                        // Mount the YAML Editor
                        try {
                            console.log(`Shell: Mounting yaml-editor with props:`, yamlEditorProps);
                            const mountedYamlEditor = mountFn(yamlEditorProps);
                            
                            // Store the mounted instance so we can unmount it later
                            mountedModulesRef.current[frameId] = {
                                unmount: () => {
                                    try {
                                        mountedYamlEditor.unmount();
                                    } catch (e) {
                                        console.error("Error unmounting yaml-editor:", e);
                                    }
                                }
                            };
                        } catch (e) {
                            console.error("Error mounting yaml-editor:", e);
                            const errorMessage = e instanceof Error ? e.message : String(e);
                            containerElement.innerHTML = `<div style="color: red; padding: 1em;">Error loading YAML Editor: ${errorMessage}</div>`;
                        }
                    })
                    .catch(err => {
                        console.error(`Shell: Error loading yaml-editor module:`, err);
                        containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to load YAML Editor. Check console for details.</div>`;
                    });
            }
        };
        
        console.log("Shell: Subscribing to config:edit:yaml event");
        const unsubscribe = eventBus.subscribe('config:edit:yaml', handleYamlEditorRequest);
        
        return () => {
            console.log("Shell: Unsubscribing from config:edit:yaml event");
            unsubscribe();
        };
    }, [availableApps, config?.frames, activeFrameId, loadFrame]);

    // Helper function to render content
    const renderActiveFrameContent = () => {
        console.log(`App.tsx: renderActiveFrameContent rendering container div for activeFrameId: ${activeFrameId}`);
        
        if (loading) {
            return <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
        }
        if (error) {
            return <Box sx={{ flexGrow: 1, p: 3 }}><Typography color="error">Error loading shell config: {error}</Typography></Box>;
        }
        if (!config?.frames || config.frames.length === 0) {
            return <Typography sx={{ p: 3, fontStyle: 'italic' }}>No frames configured. Open Preferences (gear icon) to add tabs.</Typography>;
        }
        if (!activeFrameId) {
            return <Typography sx={{ p: 3, fontStyle: 'italic' }}>Initializing or no frame selected...</Typography>;
        }

        return (
            <ErrorBoundary message={`Error loading application for frame ${activeFrameId}`}>
                <div 
                    ref={mfeContainerRef} 
                    key={`${activeFrameId}-${activeConfigId || 'list'}`} 
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
                width: verticalTabBarWidth, 
                flexShrink: 0, 
                pt: `64px`, 
                height: '100vh', 
                boxSizing: 'border-box', 
                borderRight: 1, 
                borderColor: 'divider', 
                bgcolor: 'background.paper' 
            }}>
                {!loading && !error && config?.frames && config.frames.length > 0 ? (
                    <TabBar 
                        frames={config.frames} 
                        activeFrameId={activeFrameId} 
                        onTabChange={handleTabChange} 
                        width={verticalTabBarWidth} 
                    />
                ) : (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {loading && <CircularProgress sx={{m: 2}} size={20}/>}
                        {!loading && !error && <Typography sx={{p:2, color: 'text.secondary'}}>No Tabs</Typography>}
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
