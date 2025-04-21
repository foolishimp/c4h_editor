/**
 * /packages/shell/src/App.tsx
 * Main application component that handles microfrontend loading and frame management
 * --- CORRECTED Cleanup Effect & Mount Checks ---
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
import { AppAssignment, AppDefinition, eventBus } from 'shared';
import PreferencesDialog from './components/preferences/PreferencesDialog';

// --- Theme definition ---
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

// --- Error Boundary ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode, message?: string },
  { hasError: boolean, error: any }
> {
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
           <button onClick={() => this.setState({ hasError: false, error: null })}>Try again</button>{' '}<button onClick={() => window.location.reload()}>Reload Page</button>
         </Box>
       );
     }
     return this.props.children;
   }
}


// --- AppContent Component ---
function AppContent() {
    const { config, loading, error, availableApps } = useShellConfig();
    const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
    const [isPrefsDialogOpen, setIsPrefsDialogOpen] = useState<boolean>(false);
    const mountedModulesRef = useRef<Record<string, { unmount: () => void }>>({});
    const isMountedRef = useRef(true);
    const mfeContainerRef = useRef<HTMLDivElement | null>(null);
    // --- MOVED Ref to top level ---
    const previousActiveFrameIdRef = useRef<string | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        // Cleanup function runs when AppContent unmounts
        return () => {
            isMountedRef.current = false;
            console.log("AppContent unmounting. Cleaning up all mounted modules.");
            // Unmount all known modules when the shell itself unmounts
            Object.entries(mountedModulesRef.current).forEach(([frameId, moduleInstance]) => {
                console.log(`AppContent unmount: Cleaning up module for frame ${frameId}`);
                if (moduleInstance && typeof moduleInstance.unmount === 'function') {
                    try { moduleInstance.unmount(); } catch (e) { console.error(`Error unmounting ${frameId} on AppContent cleanup:`, e);}
                }
            });
            mountedModulesRef.current = {}; // Clear refs
        };
    }, []);


    const handleOpenPrefsDialog = useCallback(() => setIsPrefsDialogOpen(true), []);
    const handleClosePrefsDialog = useCallback(() => setIsPrefsDialogOpen(false), []);

    // Effect to manage activeFrameId based on loaded config
    useEffect(() => {
        console.log("App.tsx: useEffect[config?.frames] triggered. loading:", loading, "error:", !!error);
        if (!loading && !error && config?.frames) {
            const sortedFrames = [...config.frames].sort((a, b) => a.order - b.order);
            console.log("App.tsx: Sorted frames:", sortedFrames.map(f => f.id));
            console.log("App.tsx: Current activeFrameId state:", activeFrameId);

            const currentFrameIsValid = activeFrameId ? sortedFrames.some(f => f.id === activeFrameId) : false;
            console.log("App.tsx: Is current activeFrameId valid?", currentFrameIsValid);

            if (sortedFrames.length > 0) {
                if (!currentFrameIsValid) {
                    const newActiveId = sortedFrames[0].id;
                    console.log(`App.tsx: Setting active frame. Reason: ${!activeFrameId ? 'Initial load' : 'Current ID invalid/missing'}. New ID: ${newActiveId}`);
                    if (isMountedRef.current) setActiveFrameId(newActiveId);
                } else {
                    console.log(`App.tsx: Current activeFrameId '${activeFrameId}' is still valid. No change.`);
                }
            } else {
                if (activeFrameId !== null && isMountedRef.current) {
                    console.log("App.tsx: No frames available, setting activeFrameId to null.");
                    setActiveFrameId(null);
                }
            }
        } else if (!loading && !error && !config?.frames) {
             if (activeFrameId !== null && isMountedRef.current) {
                console.log("App.tsx: Config loaded but frames array is missing/empty, setting activeFrameId to null.");
                setActiveFrameId(null);
            }
        }
    }, [config?.frames, loading, error]); // Removed activeFrameId dependency

    // --- CORRECTED Effect for cleaning up the *previous* MFE ---
    useEffect(() => {
        // This effect runs *after* the render where activeFrameId might have changed.
        // previousActiveFrameIdRef.current holds the ID from the *previous* render.

        const frameIdToCleanUp = previousActiveFrameIdRef.current;
        const currentFrameId = activeFrameId; // ID for the *current* render

        // Update the ref for the *next* render cycle's cleanup check
        previousActiveFrameIdRef.current = currentFrameId;

        // Only cleanup if the ID actually changed and there *was* a previous frame
        if (frameIdToCleanUp && frameIdToCleanUp !== currentFrameId) {
            const moduleToUnmount = mountedModulesRef.current[frameIdToCleanUp];
            if (moduleToUnmount && typeof moduleToUnmount.unmount === 'function') {
                console.log(`App.tsx: Cleanup Effect - Scheduling unmount for previous frame: ${frameIdToCleanUp}`);
                // Defer slightly to help avoid sync issues
                requestAnimationFrame(() => {
                    // Double-check the ref hasn't been cleared by another process
                    if (mountedModulesRef.current[frameIdToCleanUp] === moduleToUnmount) {
                        console.log(`App.tsx: Cleanup Effect - Executing deferred unmount for ${frameIdToCleanUp}`);
                        try {
                            moduleToUnmount.unmount();
                        } catch (err) {
                            console.error(`App.tsx: Cleanup Effect - Error during deferred unmount for frame ${frameIdToCleanUp}:`, err);
                        }
                        // Clean up the ref *after* unmount attempt
                        delete mountedModulesRef.current[frameIdToCleanUp];
                        console.log(`App.tsx: Cleanup Effect - Removed ref for ${frameIdToCleanUp}`);
                    } else {
                        console.log(`App.tsx: Cleanup Effect - Unmount for ${frameIdToCleanUp} skipped (ref already cleared or changed).`);
                    }
                });
            } else {
                // If no unmount function, still clean up the reference
                 console.log(`App.tsx: Cleanup Effect - No unmount function found for previous frame ${frameIdToCleanUp}. Removing ref.`);
                 delete mountedModulesRef.current[frameIdToCleanUp];
            }
        } else {
             console.log(`App.tsx: Cleanup Effect - Skipping cleanup (frameIdToCleanUp=${frameIdToCleanUp}, currentFrameId=${currentFrameId})`);
        }
    }, [activeFrameId]); // Run this effect when activeFrameId changes


    const handleTabChange = useCallback((_event: React.SyntheticEvent, newFrameId: string) => {
        console.log(`App.tsx: handleTabChange called. New frame ID: ${newFrameId}`);
        if (isMountedRef.current && newFrameId !== activeFrameId) {
             setActiveFrameId(newFrameId);
        }
    }, [activeFrameId]); // Dependency is correct

    // --- Effect for Mounting the *current* MFE ---
    useEffect(() => {
        // Use a flag to prevent running if effect cleans up before async ops finish
        let isEffectActive = true;
        console.log(`App.tsx: Mount Effect triggered. Frame ID: ${activeFrameId}`);

        // Get the container element using the ref
        const containerElement = mfeContainerRef.current;

        // --- STRICTER Check: Ensure container exists *before* other checks ---
        if (!containerElement) {
            console.log("App.tsx: Mount Effect - Skipping mount (Container element ref is not yet set).");
            // No cleanup needed here, the container doesn't exist for this cycle
            return;
        }

        // Ensure we have a valid frame, config, apps
        if (loading || error || !activeFrameId || !config || !availableApps) {
             console.log("App.tsx: Mount Effect - Skipping mount (loading, error, no frameId, no config, or no availableApps).");
             // Clear the container if prerequisites are not met
             containerElement.innerHTML = '';
             // Unmount anything potentially lingering for this ID (though cleanup effect should handle most)
             const existingModule = mountedModulesRef.current[activeFrameId!];
             if (existingModule) { existingModule.unmount(); delete mountedModulesRef.current[activeFrameId!]; }
             return; // Exit if prerequisites not met
        }

        const activeFrame = config.frames?.find(f => f.id === activeFrameId);
        if (!activeFrame || !activeFrame.assignedApps || activeFrame.assignedApps.length === 0) {
            console.log("App.tsx: Mount Effect - Skipping mount (Active frame invalid or no apps assigned).");
             containerElement.innerHTML = '<div style="padding: 1em; font-style: italic;">Frame has no application assigned.</div>'; // Inform user
             const existingModule = mountedModulesRef.current[activeFrameId];
             if (existingModule) { existingModule.unmount(); delete mountedModulesRef.current[activeFrameId]; }
            return;
        }

        const assignment: AppAssignment = activeFrame.assignedApps[0];
        const appDef = availableApps.find(app => app.id === assignment.appId);

        if (!appDef || !appDef.url) {
            console.error(`App.tsx: Mount Effect - Skipping mount (App definition or URL missing for ${assignment.appId}).`);
             containerElement.innerHTML = `<div style="color: red; padding: 1em;">Error: Cannot load app ${assignment.appId}. Definition or URL missing.</div>`;
             const existingModule = mountedModulesRef.current[activeFrameId];
             if (existingModule) { existingModule.unmount(); delete mountedModulesRef.current[activeFrameId]; }
            return;
        }

        // --- Mount Process ---
        console.log(`App.tsx: Mount Effect - Preparing to load & mount module for frame ${activeFrameId}, app ${appDef.id}`);

        // Clear previous content & show loading
        containerElement.innerHTML = '';
        const loadingIndicator = document.createElement('div');
        loadingIndicator.style.padding = '1em';
        loadingIndicator.innerText = `Loading ${appDef.name}...`;
        containerElement.appendChild(loadingIndicator);

        // Capture frame ID for async checks
        const currentFrameIdForMount = activeFrameId;

        import(/* @vite-ignore */ appDef.url).then(module => {
            // --- Check if effect is still active and frame hasn't changed ---
            if (!isEffectActive || activeFrameId !== currentFrameIdForMount) {
                 console.log(`App.tsx: Mount Effect - Aborting mount for ${appDef.id}. Effect inactive or frame changed.`);
                 return;
            }
            // --- Check if container is still connected ---
            if (!containerElement.isConnected) {
                 console.log(`App.tsx: Mount Effect - Aborting mount for ${appDef.id}. Container disconnected.`);
                 return;
            }

             // Remove loading indicator *before* mounting
            if (containerElement.contains(loadingIndicator)) {
                 containerElement.removeChild(loadingIndicator);
            }

            console.log(`App.tsx: Mount Effect - Module loaded for ${appDef.id}`, module);

            const props: Record<string, any> = { domElement: containerElement, name: appDef.name, eventBus: eventBus };
            // Add specific props...

            try {
                // Unmount any module currently associated with this specific frame ID *before* mounting new one
                const existingModule = mountedModulesRef.current[currentFrameIdForMount];
                if (existingModule) {
                    console.log(`App.tsx: Mount Effect - Unmounting existing module before mounting new one for frame ${currentFrameIdForMount}`);
                    if(typeof existingModule.unmount === 'function') existingModule.unmount();
                    delete mountedModulesRef.current[currentFrameIdForMount];
                }

                let unmountFn: (() => void) | undefined = undefined;

                if (module.mount && typeof module.mount === 'function') {
                     console.log(`App.tsx: Mount Effect - Mounting ${appDef.id} via mount()...`);
                     const mountResult = module.mount(props);
                     const maybeUnmount = mountResult?.unmount || module.unmount;
                     if (typeof maybeUnmount === 'function') unmountFn = maybeUnmount;

                } else if (module.default && typeof module.default === 'function') {
                     console.log(`App.tsx: Mount Effect - Mounting ${appDef.id} via ReactDOM...`);
                     const ReactComponent = module.default;
                     const reactRoot = ReactDOM.createRoot(containerElement);
                     reactRoot.render(<React.StrictMode><ReactComponent {...props} /></React.StrictMode>);
                     unmountFn = () => {
                          console.log(`App.tsx: Unmount - Unmounting React component ${appDef.id} in frame ${currentFrameIdForMount}`);
                          try { reactRoot.unmount(); } catch (e) { console.error("Error during reactRoot.unmount:", e); }
                     };
                } else {
                    throw new Error("Module is not a valid MFE (no mount or default export).");
                }

                // Store the unmount function if we got one
                 if (unmountFn) {
                     mountedModulesRef.current[currentFrameIdForMount] = { unmount: unmountFn };
                     console.log(`App.tsx: Mount Effect - Stored unmount function for ${currentFrameIdForMount}`);
                 } else {
                      mountedModulesRef.current[currentFrameIdForMount] = { unmount: () => { console.log(`No-op unmount for ${currentFrameIdForMount}`)} };
                      console.warn(`App.tsx: Mount Effect - No unmount function found or stored for ${currentFrameIdForMount}`);
                 }

            } catch (mountErr) {
                console.error(`App.tsx: Mount Effect - Error mounting/rendering module ${appDef.id}:`, mountErr);
                containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to mount/render application.</div>`;
                delete mountedModulesRef.current[currentFrameIdForMount]; // Clean up ref on error
            }

        }).catch(importErr => {
            if (!isEffectActive) return; // Check again in case effect cleaned up during network request
            console.error(`App.tsx: Mount Effect - Error dynamically importing module ${appDef.id} from ${appDef.url}:`, importErr);
            if (containerElement.contains(loadingIndicator)) {
                 containerElement.removeChild(loadingIndicator);
            }
            containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to load application module.</div>`;
            delete mountedModulesRef.current[currentFrameIdForMount]; // Clean up ref on error
        });

        // Return cleanup function for *this specific effect run*
        return () => {
            console.log(`App.tsx: Mount Effect - Cleanup executing for effect instance tied to frame ${currentFrameIdForMount}, app ${appDef?.id}`);
            isEffectActive = false;
            // Note: Actual unmounting of the module associated with the *frame ID*
            // is handled by the *other* useEffect hook that depends only on activeFrameId changing.
            // This cleanup only handles cancelling the async operations of *this specific* effect instance.
        };
    // Dependencies for the MOUNTING effect
    }, [activeFrameId, availableApps, config, error, loading]); // Depend on everything needed to decide WHICH app to mount WHERE


    // --- Helper function to render the content area ---
    const renderActiveFrameContent = () => {
        console.log("App.tsx: renderActiveFrameContent rendering container div for activeFrameId:", activeFrameId);

        // Render loading/error states directly if applicable
        if (loading) return <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
        if (error) return <Box sx={{ flexGrow: 1, p: 3 }}><Typography color="error">Error: {error}</Typography></Box>;
        if (!config?.frames || config.frames.length === 0) return <Typography sx={{ p: 3, fontStyle: 'italic' }}>No frames configured.</Typography>;
        if (!activeFrameId) return <Typography sx={{ p: 3, fontStyle: 'italic' }}>Initializing...</Typography>;

        // Render the single container div. The useEffect above will handle mounting into its ref.
        // Use activeFrameId as key to ensure React replaces the div (triggering ref updates) when the frame changes.
        return (
            <ErrorBoundary message={`Error loading application for frame ${activeFrameId}`}>
                 <div ref={mfeContainerRef} key={activeFrameId} id={`mfe-container-${activeFrameId}`} style={{height: '100%', width: '100%', overflow: 'auto'}} />
            </ErrorBoundary>
        );
    };


    // --- Main AppContent Render ---
    const verticalTabBarWidth = 200;
    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* AppBar */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'baseline' }}>
                        <Typography variant="h5" noWrap component="div" sx={{ mr: 2 }}>Visual Prompt Studio</Typography>
                        <Typography variant="subtitle1" noWrap component="div" sx={{ opacity: 0.8 }}>C4H Editor</Typography>
                    </Box>
                    <IconButton color="inherit" aria-label="open preferences" onClick={handleOpenPrefsDialog} edge="end"><SettingsIcon /></IconButton>
                </Toolbar>
            </AppBar>

            {/* TabBar */}
            <Box sx={{ width: verticalTabBarWidth, flexShrink: 0, pt: (theme) => `${theme?.mixins?.toolbar?.minHeight || 64}px`, height: '100vh', boxSizing: 'border-box', borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                {!loading && config?.frames && config.frames.length > 0 ? (
                    <TabBar frames={config.frames} activeFrameId={activeFrameId} onTabChange={handleTabChange} width={verticalTabBarWidth} />
                ) : ( <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} > {loading && <CircularProgress sx={{m: 2}} size={20}/>} {!loading && !error && <Typography sx={{p:2, color: 'text.secondary'}}>No Tabs</Typography>} </Box> )}
            </Box>

            {/* Main Content Area */}
            <Box component="main" sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Toolbar /> {/* Spacer */}
                <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Render container div via renderActiveFrameContent */}
                    {renderActiveFrameContent()}
                </Box>
            </Box>

            {/* Preferences Dialog */}
            <PreferencesDialog open={isPrefsDialogOpen} onClose={handleClosePrefsDialog} />
        </Box>
    );
} // --- End AppContent Component ---


// --- App Component (Wrapper) ---
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