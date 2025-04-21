/**
 * /packages/shell/src/App.tsx
 * Main application component that handles microfrontend loading and frame management
 * --- CORRECTED useEffect for activeFrameId ---
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as ReactDOM from 'react-dom/client'; // Keep if using ReactDOM.createRoot elsewhere, otherwise can be just 'react-dom/client'
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
// Import eventBus and necessary types from shared package
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
// (Keep the ErrorBoundary class definition as it was)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode, message?: string },
  { hasError: boolean, error: any }
> {
   constructor(props: { children: React.ReactNode, message?: string }) {
     super(props);
     this.state = { hasError: false, error: null };
   }

   static getDerivedStateFromError(error: any) {
     return { hasError: true, error };
   }

   componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
     console.error("ErrorBoundary caught:", error, errorInfo);
   }

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


// --- AppContent Component ---
function AppContent() {
    // Get state from context - MAKE SURE availableApps is destructured if needed elsewhere
    const { config, loading, error, availableApps } = useShellConfig();
    const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
    const [isPrefsDialogOpen, setIsPrefsDialogOpen] = useState<boolean>(false);
    // Use useRef to keep track of mounted modules/components and their unmount functions
    const mountedModulesRef = useRef<Record<string, { unmount: () => void }>>({});

    const handleOpenPrefsDialog = useCallback(() => {
        setIsPrefsDialogOpen(true);
    }, []);

    const handleClosePrefsDialog = useCallback(() => {
        setIsPrefsDialogOpen(false);
    }, []);

    // --- CORRECTED useEffect Hook for activeFrameId management ---
    useEffect(() => {
        console.log("App.tsx: useEffect for activeFrameId triggered. loading:", loading, "error:", !!error);
        // Only proceed if config is loaded without errors
        if (!loading && !error && config?.frames) {
            // Sort frames by order to ensure consistent default selection
            const sortedFrames = [...config.frames].sort((a, b) => a.order - b.order);
            console.log("App.tsx: Sorted frames:", sortedFrames.map(f => f.id));
            console.log("App.tsx: Current activeFrameId state:", activeFrameId);

            // Check if the current activeFrameId exists in the *current* list of frames
            const currentFrameIsValid = activeFrameId ? sortedFrames.some(f => f.id === activeFrameId) : false;
            console.log("App.tsx: Is current activeFrameId valid?", currentFrameIsValid);

            if (sortedFrames.length > 0) {
                // If current frame is not valid (or no frame is active yet), set to the first available frame
                if (!currentFrameIsValid) {
                    const newActiveId = sortedFrames[0].id;
                    console.log(`App.tsx: Setting active frame. Reason: ${!activeFrameId ? 'Initial load' : 'Current ID invalid/missing'}. New ID: ${newActiveId}`);
                    setActiveFrameId(newActiveId);
                } else {
                    console.log(`App.tsx: Current activeFrameId '${activeFrameId}' is still valid. No change.`);
                }
            } else {
                // No frames available, set activeFrameId to null
                if (activeFrameId !== null) {
                    console.log("App.tsx: No frames available, setting activeFrameId to null.");
                    setActiveFrameId(null);
                }
            }
        } else if (!loading && !error && !config?.frames) {
            // Config loaded, but no frames array - ensure activeId is null
             if (activeFrameId !== null) {
                console.log("App.tsx: Config loaded but frames array is missing/empty, setting activeFrameId to null.");
                setActiveFrameId(null);
            }
        }
        // Dependency array: Trigger when loading/error state changes, or when config.frames potentially changes
    }, [config?.frames, loading, error, activeFrameId]); // Keep activeFrameId here if needed for the 'currentFrameIsValid' check consistency
    // --- End CORRECTED useEffect ---


    // Clean up modules when component unmounts or activeFrameId changes significantly
    useEffect(() => {
        // Store the current value of activeFrameId when the effect is set up
        const frameIdToCleanUp = activeFrameId;

        // Return the cleanup function
        return () => {
            // Use the captured frameIdToCleanUp in the cleanup logic
            if (frameIdToCleanUp) {
                const moduleToUnmount = mountedModulesRef.current[frameIdToCleanUp];
                if (moduleToUnmount && typeof moduleToUnmount.unmount === 'function') {
                    console.log(`App.tsx: Cleanup - Unmounting module for previous frame: ${frameIdToCleanUp}`);
                    try {
                        moduleToUnmount.unmount();
                    } catch (err) {
                        console.error(`App.tsx: Cleanup - Error unmounting module for frame ${frameIdToCleanUp}:`, err);
                    }
                    // Remove the reference after unmounting
                    delete mountedModulesRef.current[frameIdToCleanUp];
                }
            }
        };
        // This effect should run when activeFrameId changes, ensuring the *previous* frame's module gets unmounted.
    }, [activeFrameId]);


    const handleTabChange = useCallback((_event: React.SyntheticEvent, newFrameId: string) => {
        console.log(`App.tsx: handleTabChange called. New frame ID: ${newFrameId}`);
        if (newFrameId !== activeFrameId) {
             setActiveFrameId(newFrameId);
        }
    }, [activeFrameId]); // Add activeFrameId dependency

    // --- Helper function to render the content for the active frame ---
    const renderActiveFrameContent = () => {
        console.log("App.tsx: renderActiveFrameContent called. activeFrameId:", activeFrameId);
        // Check loading/error states from useShellConfig() first
        if (loading) {
             console.log("renderActiveFrameContent: Showing loading spinner.");
             return <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
        }
        if (error) {
              console.log("renderActiveFrameContent: Showing error message:", error);
              return (
                 <Box sx={{ flexGrow: 1, p: 3 }}>
                     <Typography color="error">Error loading shell configuration:</Typography>
                     <Typography color="error" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{error}</Typography>
                 </Box>
             );
        }

        // --- Simplified CHECK: Ensure config essentials are loaded ---
        // Check if config and necessary data arrays are loaded before proceeding
        // We rely on the useEffect above to set a *valid* activeFrameId if possible
        if (!config || !config.frames || !availableApps) {
            console.log("renderActiveFrameContent: Waiting for config, frames, and availableApps to load...");
            return <Typography sx={{ p: 3, fontStyle: 'italic' }}>Loading configuration...</Typography>;
        }
        // --- End Simplified CHECK ---


        // Handle cases where no frames exist or no frame is selected
        if (config.frames.length === 0) {
             console.log("renderActiveFrameContent: No frames configured.");
             return <Typography sx={{ p: 3, fontStyle: 'italic' }}>No frames configured. Open Preferences (gear icon) to add tabs.</Typography>;
        }
        if (!activeFrameId) {
             console.log("renderActiveFrameContent: No active frame selected.");
             // This case should ideally be handled by the useEffect setting a default
             return <Typography sx={{ p: 3, fontStyle: 'italic' }}>Select a frame to view its content.</Typography>;
        }

        // Find the active frame definition using the current (and hopefully valid) activeFrameId
        const activeFrame = config.frames.find(f => f.id === activeFrameId);

        // Handle case where activeFrameId is somehow invalid despite useEffect (should be rare)
        if (!activeFrame) {
            console.warn(`renderActiveFrameContent: Could not find frame definition for activeFrameId: ${activeFrameId}. This might be a timing issue or invalid ID.`);
            // Optionally try setting a default again here, or show error
            // setActiveFrameId(config.frames[0].id); // Example: Force reset (might cause loop if not careful)
            return <Typography sx={{ p: 3 }}>Selected frame ('{activeFrameId}') not found in current configuration.</Typography>;
        }

        // Check if apps are assigned to the active frame
        if (!activeFrame.assignedApps || activeFrame.assignedApps.length === 0) {
            console.log(`renderActiveFrameContent: No application assigned to frame '${activeFrame.name}'.`);
            return <Typography sx={{ p: 3 }}>No application assigned to the '{activeFrame.name}' frame.</Typography>;
        }

        // Get the first assigned app
        const assignment: AppAssignment = activeFrame.assignedApps[0];

        // --- Lookup the app definition using the availableApps from context ---
        // availableApps should be valid here because of the check at the start of the function
        console.log(`renderActiveFrameContent: Looking for app ID '${assignment.appId}' in availableApps:`, availableApps);
        const appDef = availableApps.find(app => app.id === assignment.appId);

        // Handle missing app definition
        if (!appDef) {
             console.error(`renderActiveFrameContent: App definition missing in availableApps for assigned app ID: ${assignment.appId}`);
             return <Typography color="error" sx={{ p: 3 }}>Error: Application definition for '{assignment.appId}' not found in the list of available applications.</Typography>;
        }

        // Handle missing app URL
        if (!appDef.url) {
             console.error(`renderActiveFrameContent: URL missing for app ID: ${assignment.appId}`);
             return <Typography color="error" sx={{ p: 3 }}>Error: Application URL is missing for '{appDef.name}'. Cannot load microfrontend.</Typography>;
        }

        // --- Dynamic Module Loading Logic ---
        console.log(`renderActiveFrameContent: Preparing to load ESM module for app: ${appDef.id} from URL: ${appDef.url}`);

        // Mount function to be passed to the ref
        const mountModule = (el: HTMLDivElement | null) => {
            if (!el || !activeFrameId) { // Check element and ensure activeFrameId hasn't changed unexpectedly
                console.error('mountModule: Cannot mount - DOM element or activeFrameId missing.', { el, activeFrameId });
                return;
            }
            // Capture frameId at the time of mount setup to prevent closure issues if activeFrameId changes rapidly
            const currentFrameId = activeFrameId;

            console.log(`mountModule: Attempting mount for frame ${currentFrameId}, app ${appDef.id}`);

            // --- Unmount existing module for this frame ---
            // Check specifically for the currentFrameId we intend to mount into
            const existingModule = mountedModulesRef.current[currentFrameId];
            if (existingModule) {
                console.log(`mountModule: Unmounting existing module in frame ${currentFrameId}`);
                if (typeof existingModule.unmount === 'function') {
                    try {
                        existingModule.unmount();
                    } catch (err) {
                        console.error(`mountModule: Error unmounting previous module for frame ${currentFrameId}:`, err);
                    }
                }
                // Clear the reference immediately after attempting unmount
                delete mountedModulesRef.current[currentFrameId];
            }
            // --- End Unmount ---


            // Load and mount the new module using dynamic import
            console.log(`mountModule: Loading module from URL: ${appDef.url}`);
            import(/* @vite-ignore */ appDef.url).then(module => {
                // --- Check if component is still mounted and frame is still active ---
                // Ensure the element is still in the DOM and the frame hasn't changed *while* loading
                 if (!el.isConnected) {
                    console.warn(`mountModule: Element for frame ${currentFrameId} disconnected before module could mount.`);
                    return;
                 }
                 if (activeFrameId !== currentFrameId) {
                     console.warn(`mountModule: Frame changed from ${currentFrameId} to ${activeFrameId} while module ${appDef.id} was loading. Aborting mount.`);
                     return;
                 }
                 // --- End Check ---


                console.log(`mountModule: Module loaded successfully from ${appDef.url}`, module);

                // Create props for the microfrontend
                const props: Record<string, any> = {
                     domElement: el,
                     name: appDef.name,
                     eventBus: eventBus
                     // Add other standard props
                };

                // Add props for specific app types
                if (appDef.id.startsWith('config-selector-')) {
                    const configType = appDef.id.replace('config-selector-', '');
                    Object.assign(props, {
                        configType,
                        onNavigateBack: () => { /* ... event bus logic ... */ },
                        onNavigateTo: (configId: string) => { /* ... event bus logic ... */ }
                    });
                }
                // Add props for other app types...

                // Mount the module
                try {
                    let mountResult: any = null;
                    if (module.mount && typeof module.mount === 'function') {
                         console.log(`mountModule: Mounting module ${appDef.id} using mount()...`);
                         mountResult = module.mount(props);
                         // Store the unmount function if the module provides one directly or via result
                         const unmountFn = mountResult?.unmount || module.unmount;
                         if (typeof unmountFn === 'function') {
                              mountedModulesRef.current[currentFrameId] = { unmount: unmountFn };
                         } else {
                              console.warn(`mountModule: Module ${appDef.id} provided 'mount' but no 'unmount' function.`);
                              // Store a no-op unmount if necessary, or handle differently
                              mountedModulesRef.current[currentFrameId] = { unmount: () => {} };
                         }

                    } else if (module.default && typeof module.default === 'function') {
                        console.log(`mountModule: Rendering module ${appDef.id} as React component...`);
                        const ReactComponent = module.default;
                        const reactRoot = ReactDOM.createRoot(el);
                        reactRoot.render(
                            <React.StrictMode> {/* Or other providers */}
                                <ReactComponent {...props} />
                            </React.StrictMode>
                        );
                        // Store React-specific unmount function
                        mountedModulesRef.current[currentFrameId] = {
                            unmount: () => {
                                console.log(`mountModule/unmount: Unmounting React component for ${appDef.id} in frame ${currentFrameId}`);
                                try {
                                     reactRoot.unmount();
                                } catch (unmountErr) {
                                     console.error(`mountModule/unmount: Error during reactRoot.unmount for ${appDef.id}:`, unmountErr);
                                }
                            }
                        };
                    } else {
                        console.error(`mountModule: Module from ${appDef.url} is not a valid MFE (no mount or default export).`);
                        el.innerHTML = `<div style="color: red; padding: 1em;">Failed to load: Invalid module structure.</div>`;
                    }
                } catch (mountErr) {
                    console.error(`mountModule: Error mounting/rendering module from ${appDef.url}:`, mountErr);
                    el.innerHTML = `<div style="color: red; padding: 1em;">Failed to load: Error during mount/render.</div>`;
                     // Clean up ref if mount fails catastrophically
                     delete mountedModulesRef.current[currentFrameId];
                }

            }).catch(importErr => {
                console.error(`mountModule: Error dynamically importing module from ${appDef.url}:`, importErr);
                 el.innerHTML = `<div style="color: red; padding: 1em;">Failed to load application module. Check console.</div>`;
                 // Clean up ref if import fails
                 delete mountedModulesRef.current[currentFrameId];
            });
        }; // End of mountModule function

        // Container div where the dynamically loaded module will be mounted
        return (
          <ErrorBoundary message={`Error loading application: ${appDef.name}`}>
              {/* Key ensures component remounts if appDef or activeFrame changes */}
              <div ref={mountModule} key={`${activeFrame.id}-${appDef.id}`} id={`mfe-container-${activeFrame.id}-${appDef.id}`} style={{height: '100%', width: '100%', overflow: 'auto'}} />
          </ErrorBoundary>
        );
    }; // End of renderActiveFrameContent function


    // --- Main AppContent Render ---
    const verticalTabBarWidth = 200;
    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Main AppBar */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'baseline' }}>
                         <Typography variant="h5" noWrap component="div" sx={{ mr: 2 }}>
                            Visual Prompt Studio
                        </Typography>
                         <Typography variant="subtitle1" noWrap component="div" sx={{ opacity: 0.8 }}>
                            C4H Editor
                        </Typography>
                    </Box>
                     <IconButton
                        color="inherit"
                        aria-label="open preferences"
                        onClick={handleOpenPrefsDialog}
                        edge="end"
                    >
                        <SettingsIcon />
                    </IconButton>
                </Toolbar>
             </AppBar>

            {/* Vertical TabBar / Sidebar Container */}
             <Box sx={{
                width: verticalTabBarWidth,
                flexShrink: 0,
                pt: (theme) => `${theme?.mixins?.toolbar?.minHeight || 64}px`, // Use theme spacing
                height: '100vh', // Ensure full height
                boxSizing: 'border-box',
                borderRight: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper'
             }}>
                {/* Render TabBar */}
                {/* Ensure TabBar receives the potentially updated config.frames */}
                {!loading && config?.frames && config.frames.length > 0 ? (
                     <TabBar
                         frames={config.frames} // Pass current frames
                         activeFrameId={activeFrameId}
                         onTabChange={handleTabChange}
                         width={verticalTabBarWidth}
                     />
                ) : (
                     <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
                         {loading && <CircularProgress sx={{m: 2}} size={20}/>}
                         {!loading && !error && <Typography sx={{p:2, color: 'text.secondary'}}>No Tabs</Typography>}
                     </Box>
                 )}
             </Box>

            {/* Main content area */}
            <Box component="main" sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* AppBar Spacer */}
                <Toolbar />
                {/* Content Display Area */}
                {/* Ensure this Box takes remaining height and allows scrolling if needed */}
                 <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' /* Prevent double scrollbars */ }}>
                    {/* Render the active frame's content */}
                    {renderActiveFrameContent()}
                 </Box>
            </Box>

            {/* Preferences Dialog */}
            <PreferencesDialog
                open={isPrefsDialogOpen}
                onClose={handleClosePrefsDialog}
             />
        </Box>
    );
} // --- End AppContent Component ---


// --- App Component (Wrapper) ---
function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {/* Ensure Provider wraps the component using the context */}
            <ShellConfigProvider>
                <Router>
                    <AppContent />
                </Router>
            </ShellConfigProvider>
        </ThemeProvider>
    );
}

export default App;