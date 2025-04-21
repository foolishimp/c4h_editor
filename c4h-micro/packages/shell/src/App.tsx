/**
 * /packages/shell/src/App.tsx
 * Main application component that handles microfrontend loading and frame management
 * --- CORRECTED: Syntax Error in Mount Call ---
 * --- CORRECTED: React Component Unmount Logic ---
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as ReactDOM from 'react-dom/client'; // Import client for createRoot
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
import { useShellConfig, ShellConfigProvider, ShellConfigContextState } from './contexts/ShellConfigContext'; // Ensure ShellConfigContextState is exported/imported if needed
import TabBar from './components/layout/TabBar';
import { AppAssignment, AppDefinition, eventBus } from 'shared'; // Ensure Frame is imported if used directly
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
    // Use ShellConfigContextState for type safety if imported
    const { config, loading, error, availableApps } = useShellConfig();
    const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
    const [isPrefsDialogOpen, setIsPrefsDialogOpen] = useState<boolean>(false);
    // Store mounted modules/components with their unmount functions
    const mountedModulesRef = useRef<Record<string, { unmount: () => void }>>({});
    const isMountedRef = useRef(true); // Track component mount status
    const mfeContainerRef = useRef<HTMLDivElement | null>(null); // Ref for the MFE container div
    const previousActiveFrameIdRef = useRef<string | null>(null); // Ref to track the previous frame ID for cleanup

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
            mountedModulesRef.current = {}; // Clear refs
        };
    }, []);

    // Handlers for preferences dialog
    const handleOpenPrefsDialog = useCallback(() => setIsPrefsDialogOpen(true), []);
    const handleClosePrefsDialog = useCallback(() => setIsPrefsDialogOpen(false), []);

    // Effect to manage activeFrameId based on loaded config
    useEffect(() => {
        console.log("App.tsx: useEffect[config?.frames] triggered. loading:", loading, "error:", !!error);
        if (!loading && !error && config?.frames) {
            const sortedFrames = [...config.frames].sort((a, b) => a.order - b.order);
            const currentFrameIsValid = activeFrameId ? sortedFrames.some(f => f.id === activeFrameId) : false;

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

    // Effect for cleaning up the *previous* MFE when activeFrameId changes
    useEffect(() => {
        const frameIdToCleanUp = previousActiveFrameIdRef.current;
        const currentFrameId = activeFrameId;
        previousActiveFrameIdRef.current = currentFrameId; // Update ref for next cycle

        if (frameIdToCleanUp && frameIdToCleanUp !== currentFrameId) {
            const moduleToUnmount = mountedModulesRef.current[frameIdToCleanUp];
            if (moduleToUnmount && typeof moduleToUnmount.unmount === 'function') {
                console.log(`App.tsx: Cleanup Effect - Scheduling unmount for previous frame: ${frameIdToCleanUp}`);
                // Defer unmount slightly
                requestAnimationFrame(() => {
                    if (mountedModulesRef.current[frameIdToCleanUp] === moduleToUnmount) {
                        console.log(`App.tsx: Cleanup Effect - Executing deferred unmount for ${frameIdToCleanUp}`);
                        try {
                            moduleToUnmount.unmount();
                        } catch (err) {
                            console.error(`App.tsx: Cleanup Effect - Error during deferred unmount for frame ${frameIdToCleanUp}:`, err);
                        }
                        delete mountedModulesRef.current[frameIdToCleanUp]; // Clean up ref *after* attempt
                        console.log(`App.tsx: Cleanup Effect - Removed ref for ${frameIdToCleanUp}`);
                    } else {
                         console.log(`App.tsx: Cleanup Effect - Unmount for ${frameIdToCleanUp} skipped (ref already cleared or changed).`);
                    }
                });
            } else {
                 console.log(`App.tsx: Cleanup Effect - No unmount function found for previous frame ${frameIdToCleanUp}. Removing ref.`);
                 delete mountedModulesRef.current[frameIdToCleanUp]; // Still remove ref
            }
        } else {
             console.log(`App.tsx: Cleanup Effect - Skipping cleanup (frameIdToCleanUp=${frameIdToCleanUp}, currentFrameId=${currentFrameId})`);
        }
    }, [activeFrameId]); // Run only when activeFrameId changes

    // Handler for tab changes
    const handleTabChange = useCallback((_event: React.SyntheticEvent, newFrameId: string) => {
        console.log(`App.tsx: handleTabChange called. New frame ID: ${newFrameId}`);
        if (isMountedRef.current && newFrameId !== activeFrameId) {
             setActiveFrameId(newFrameId);
        }
    }, [activeFrameId]); // Depends on activeFrameId to prevent unnecessary updates

    // --- Effect for Mounting the *current* MFE ---
    useEffect(() => {
        let isEffectActive = true; // Flag to manage async operations
        const containerElement = mfeContainerRef.current; // Get container DOM element

        console.log(`App.tsx: Mount Effect triggered. Frame ID: ${activeFrameId}, Container Element:`, containerElement);

        // --- Guard Clauses ---
        if (!containerElement) {
            console.log("App.tsx: Mount Effect - Skipping mount (Container element ref is not yet set).");
            return;
        }
        if (loading || error || !activeFrameId || !config || !availableApps) {
            console.log("App.tsx: Mount Effect - Skipping mount (Prerequisites not met: loading, error, no frameId, config, or apps).");
            containerElement.innerHTML = ''; // Clear container
            // Clean up any potentially lingering module for this ID
            const existingModule = mountedModulesRef.current[activeFrameId!];
            if (existingModule) { try { existingModule.unmount(); } catch(e) { console.error("Unmount error in prereq cleanup:", e); } delete mountedModulesRef.current[activeFrameId!]; }
            return;
        }
        const activeFrame = config.frames?.find(f => f.id === activeFrameId);
        if (!activeFrame || !activeFrame.assignedApps || activeFrame.assignedApps.length === 0) {
            console.log("App.tsx: Mount Effect - Skipping mount (Active frame invalid or no apps assigned).");
            containerElement.innerHTML = '<div style="padding: 1em; font-style: italic;">Frame has no application assigned.</div>';
            const existingModule = mountedModulesRef.current[activeFrameId];
            if (existingModule) { try { existingModule.unmount(); } catch(e) { console.error("Unmount error in invalid frame cleanup:", e); } delete mountedModulesRef.current[activeFrameId]; }
            return;
        }
        const assignment: AppAssignment = activeFrame.assignedApps[0];
        const appDef = availableApps.find(app => app.id === assignment.appId);
        if (!appDef || !appDef.url) {
            console.error(`App.tsx: Mount Effect - Skipping mount (App definition or URL missing for ${assignment.appId}).`);
            containerElement.innerHTML = `<div style="color: red; padding: 1em;">Error: Cannot load app ${assignment.appId}. Definition or URL missing.</div>`;
            const existingModule = mountedModulesRef.current[activeFrameId];
            if (existingModule) { try { existingModule.unmount(); } catch(e) { console.error("Unmount error in missing def cleanup:", e); } delete mountedModulesRef.current[activeFrameId]; }
            return;
        }
        // --- End Guard Clauses ---

        // --- Mount Process ---
        console.log(`App.tsx: Mount Effect - Preparing to load & mount module for frame ${activeFrameId}, app ${appDef.id} from ${appDef.url}`);
        containerElement.innerHTML = ''; // Clear previous content
        const loadingIndicator = document.createElement('div');
        loadingIndicator.style.padding = '1em'; loadingIndicator.innerText = `Loading ${appDef.name}...`;
        containerElement.appendChild(loadingIndicator);
        const currentFrameIdForMount = activeFrameId; // Capture frame ID for async checks

        // --- Dynamic Import ---
        import(/* @vite-ignore */ appDef.url).then(module => {
            if (!isEffectActive || activeFrameId !== currentFrameIdForMount || !containerElement.isConnected) {
                console.log(`App.tsx: Mount Effect - Aborting mount for ${appDef.id}. Effect inactive, frame changed, or container disconnected.`);
                // Ensure loading indicator is removed if we abort here
                 if (containerElement.contains(loadingIndicator)) {
                     try { containerElement.removeChild(loadingIndicator); } catch (e) {}
                 }
                return;
            }
            if (containerElement.contains(loadingIndicator)) {
                 try { containerElement.removeChild(loadingIndicator); } catch (e) {}
            }

            console.log(`App.tsx: Mount Effect - Module loaded for ${appDef.id}`, module);
            // Base props common to all parcels
            const baseProps: Record<string, any> = { domElement: containerElement, name: appDef.name };
            // Prepare custom props (example for config-selector)
            let customProps = {};
            if (appDef.id.startsWith('config-selector-')) {
                const configType = appDef.id.replace('config-selector-', '');
                const handleMfeNavigateBack = (): void => console.log(`Shell: MFE (${appDef.id}) requested navigation back.`);
                const handleMfeNavigateTo = (configId: string): void => console.log(`Shell: MFE (${appDef.id}) requested navigation to config: ${configId}`);
                customProps = { configType, onNavigateBack: handleMfeNavigateBack, onNavigateTo: handleMfeNavigateTo };
            }

            try {
                // Unmount any existing module for *this specific frame ID* before mounting new one
                const existingModule = mountedModulesRef.current[currentFrameIdForMount];
                if (existingModule) {
                    console.log(`App.tsx: Mount Effect - Unmounting existing module before mounting new one for frame ${currentFrameIdForMount}`);
                    if (typeof existingModule.unmount === 'function') { try { existingModule.unmount(); } catch(e){ console.error("Unmount error pre-mount:", e); } }
                    delete mountedModulesRef.current[currentFrameIdForMount];
                }

                let unmountFn: (() => void) | undefined = undefined;

                // --- FIXED: Mount Call Syntax ---
                if (module.mount && typeof module.mount === 'function') {
                    console.log(`App.tsx: Mount Effect - Mounting ${appDef.id} via module.mount()...`);
                    // Combine baseProps and customProps using spread operator for both
                    const mountResult = module.mount({ ...baseProps, ...customProps });
                    // Prefer unmount from result, fallback to module export
                    const maybeUnmount = mountResult?.unmount || module.unmount;
                    if (typeof maybeUnmount === 'function') unmountFn = maybeUnmount;
                // --- FIXED: React Component Unmount Logic ---
                } else if (module.default && typeof module.default === 'function') {
                    console.log(`App.tsx: Mount Effect - Mounting ${appDef.id} as React component via ReactDOM...`);
                    const ReactComponent = module.default;
                    // 1. Create root ONCE
                    const reactRoot = ReactDOM.createRoot(containerElement);
                    // 2. Render using the created root
                    reactRoot.render(
                        <React.StrictMode>
                            {/* Combine props using spread */}
                            <ReactComponent {...baseProps} {...customProps} />
                        </React.StrictMode>
                    );
                    // 3. Store the unmount function from THIS root instance
                    unmountFn = () => {
                         console.log(`App.tsx: Unmount - Unmounting React component ${appDef.id} in frame ${currentFrameIdForMount}`);
                         try { reactRoot.unmount(); } catch (e) { console.error("Error during reactRoot.unmount:", e); }
                    };
                // --- End Fix ---
                } else {
                    throw new Error("Module is not a valid MFE (no mount function or default React component export).");
                }

                // Store the obtained unmount function
                if (unmountFn) {
                    mountedModulesRef.current[currentFrameIdForMount] = { unmount: unmountFn };
                    console.log(`App.tsx: Mount Effect - Stored unmount function for ${currentFrameIdForMount}`);
                } else {
                     // Store a no-op if no unmount provided, still track mount
                     mountedModulesRef.current[currentFrameIdForMount] = { unmount: () => { console.warn(`No-op unmount called for ${currentFrameIdForMount}`)} };
                     console.warn(`App.tsx: Mount Effect - No valid unmount function found or stored for ${currentFrameIdForMount}`);
                }

            } catch (mountErr) {
                console.error(`App.tsx: Mount Effect - Error mounting/rendering module ${appDef.id}:`, mountErr);
                containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to mount/render application.</div>`;
                delete mountedModulesRef.current[currentFrameIdForMount]; // Clean up ref on error
            }

        }).catch(importErr => {
            if (!isEffectActive) return;
            console.error(`App.tsx: Mount Effect - Error dynamically importing module ${appDef.id} from ${appDef.url}:`, importErr);
             if (containerElement.contains(loadingIndicator)) {
                 try { containerElement.removeChild(loadingIndicator); } catch(e){}
             }
            containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to load application module. Check console & network tab.</div>`;
            delete mountedModulesRef.current[currentFrameIdForMount]; // Clean up ref on error
        });

        // Return cleanup function for *this specific effect run*
        return () => {
            console.log(`App.tsx: Mount Effect - Cleanup executing for effect instance tied to frame ${currentFrameIdForMount}, app ${appDef?.id}`);
            isEffectActive = false;
            // Note: Actual unmounting of the module associated with the *frame ID*
            // is handled by the *other* useEffect hook that depends only on activeFrameId changing.
        };
    // Dependencies for the MOUNTING effect: run when any of these change.
    }, [activeFrameId, availableApps, config, error, loading]);


    // --- Helper function to render the content area ---
    const renderActiveFrameContent = () => {
        console.log("App.tsx: renderActiveFrameContent rendering container div for activeFrameId:", activeFrameId);
        // Render loading/error states directly if applicable
        if (loading) return <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
        if (error) return <Box sx={{ flexGrow: 1, p: 3 }}><Typography color="error">Error loading shell config: {error}</Typography></Box>;
        if (!config?.frames || config.frames.length === 0) return <Typography sx={{ p: 3, fontStyle: 'italic' }}>No frames configured. Open Preferences (gear icon) to add tabs.</Typography>;
        if (!activeFrameId) return <Typography sx={{ p: 3, fontStyle: 'italic' }}>Initializing or no frame selected...</Typography>;

        // Render the single container div. The useEffect above will handle mounting into its ref.
        // Use activeFrameId as key to ensure React replaces the div (triggering ref updates and effect runs) when the frame changes.
        return (
            <ErrorBoundary message={`Error loading application for frame ${activeFrameId}`}>
                 {/* This div is the target for the mount effect */}
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
                {/* The container for the MFE, rendered by renderActiveFrameContent */}
                <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden', position: 'relative' /* Ensure positioning context */ }}>
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
            {/* ShellConfigProvider fetches config and provides it via context */}
            <ShellConfigProvider>
                <Router>
                    {/* AppContent consumes context and renders UI */}
                    <AppContent />
                </Router>
            </ShellConfigProvider>
        </ThemeProvider>
    );
}

export default App;