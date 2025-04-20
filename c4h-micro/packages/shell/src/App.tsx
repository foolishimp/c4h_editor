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
import { eventBus } from 'shared'; // Import eventBus from shared
import { useShellConfig, ShellConfigProvider } from './contexts/ShellConfigContext';
import TabBar from './components/layout/TabBar';
import { AppAssignment } from 'shared'; // Import AppDefinition if not already
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
class ErrorBoundary extends React.Component<{ children: React.ReactNode, message?: string }, { hasError: boolean, error: any }> {
   constructor(props: { children: React.ReactNode, message?: string }) {
     super(props);
     this.state = { hasError: false, error: null };
   }
   static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
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

// Create EventBus context to provide the singleton instance to components
interface EventBusContextValue {
    eventBus: typeof eventBus;
}

const EventBusContext = React.createContext<EventBusContextValue>({
    eventBus: eventBus
});

// Hook to provide easy access to the event bus
export const useEventBus = () => {
    const context = React.useContext(EventBusContext);
    if (!context) {
        throw new Error('useEventBus must be used within EventBusProvider');
    }
    return context.eventBus;
};
// --- AppContent Component ---
function AppContent() {
    const { config, loading, error } = useShellConfig();
    const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
    const [isPrefsDialogOpen, setIsPrefsDialogOpen] = useState<boolean>(false);

    // References to hold the dynamically loaded modules
    const loadedModulesRef = useRef<Record<string, any>>({});
    const handleOpenPrefsDialog = useCallback(() => {
        setIsPrefsDialogOpen(true);
    }, []);

    const handleClosePrefsDialog = useCallback(() => {
        setIsPrefsDialogOpen(false);
    }, []);

    // useEffect Hook for activeFrameId management
    useEffect(() => {
        if (!loading && !error && config?.frames) {
            const sortedFrames = [...config.frames].sort((a, b) => a.order - b.order);
            const currentFrameExists = activeFrameId ? sortedFrames.some(f => f.id === activeFrameId) : false;

            if (sortedFrames.length === 0) {
                if (activeFrameId !== null) {
                    console.log("No frames available, setting activeFrameId to null.");
                    setActiveFrameId(null);
                }
            }
            else if (!currentFrameExists || !activeFrameId) {
                const newActiveId = sortedFrames[0].id;
                console.log(`Setting active frame. Reason: ${!currentFrameExists ? 'Current frame missing' : 'Initial load'}. New ID: ${newActiveId}`);
                setActiveFrameId(newActiveId);
            }
        } else if (!loading && !error && !config?.frames) {
            if (activeFrameId !== null) {
                console.log("Config loaded but frames array is missing, setting activeFrameId to null.");
                setActiveFrameId(null);
            }
        }
    }, [config, loading, error, activeFrameId]);

    // Clean up parcels when activeFrameId changes or component unmounts
    useEffect(() => {                                    
        // Clean up effect for handling module unmounting if needed
        return () => { 
            // For ESM modules, we might not need explicit cleanup as they don't have lifecycle methods
            // But we can clear references and trigger cleanup functions if modules expose them
            const previousModule = loadedModulesRef.current[activeFrameId!];
            if (previousModule && typeof previousModule.cleanup === 'function') {
                console.log(`Calling cleanup for module in frame: ${activeFrameId}`);
                previousModule.cleanup();
            }
            // Keep track of loaded modules if needed
        };
    }, [activeFrameId]);

    const handleTabChange = (_event: React.SyntheticEvent, newFrameId: string) => {
        setActiveFrameId(newFrameId);
    };

    // --- Helper function to render the content for the active frame ---
    const renderActiveFrameContent = () => {
        if (loading) {
             return <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
        }
        if (error) {
              return (
                 <Box sx={{ flexGrow: 1, p: 3 }}>
                     <Typography color="error">Error loading shell configuration:</Typography>
                     <Typography color="error" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{error}</Typography>
                 </Box>
             );
        }
        if (!config || !config.frames || config.frames.length === 0) {
            return <Typography sx={{ p: 3, fontStyle: 'italic' }}>No frames configured. Open Preferences (gear icon) to add tabs.</Typography>;
        }
        if (!activeFrameId) {
            return <Typography sx={{ p: 3, fontStyle: 'italic' }}>Select a frame to view its content.</Typography>;
        }

        const activeFrame = config.frames.find(f => f.id === activeFrameId);
        if (!activeFrame) {
            console.warn(`No frame found for activeFrameId: ${activeFrameId}`);
            return <Typography sx={{ p: 3 }}>Frame not found or selected frame was removed.</Typography>;
        }
        if (!activeFrame.assignedApps || activeFrame.assignedApps.length === 0) {
            return <Typography sx={{ p: 3 }}>No application assigned to the '{activeFrame.name}' frame.</Typography>;
        }

        const assignment: AppAssignment = activeFrame.assignedApps[0];
        const appDefinition = config.availableApps?.find(app => app.id === assignment.appId);

        if (!appDefinition) {
             console.error(`App definition missing for app ID: ${assignment.appId}`);
             return <Typography color="error" sx={{ p: 3 }}>Error: Application definition not found for '{assignment.appId}'. Check Preferences Service configuration.</Typography>;
        }
        // Check for URL provided by the backend
        if (!appDefinition.url) {
             console.error(`URL missing in dynamically fetched App definition for app ID: ${assignment.appId}`);
             return <Typography color="error" sx={{ p: 3 }}>Error: Application URL is missing for '{appDefinition.name}'. Cannot load microfrontend.</Typography>;
        }

        console.log(`Preparing to mount Single-SPA parcel for app: ${appDefinition.id} from URL: ${appDefinition.url}`);

        // Reference to hold the DOM element where we'll mount the module
        const containerRef = useRef<HTMLDivElement | null>(null);
        
        // Function to load and mount the module
        const loadModule = async () => {
            if (!containerRef.current || !activeFrameId || !appDefinition.url) {
                console.error('Cannot load module: DOM element or activeFrameId not available');
                return;
            }

            // Clean up any previously loaded module for this frame if needed
            const previousModule = loadedModulesRef.current[activeFrameId];
            if (previousModule && typeof previousModule.cleanup === 'function') {
                console.log(`Cleaning up previous module for frame ${activeFrameId}`);
                previousModule.cleanup();
            }

            try {
                console.log(`Dynamically importing module from URL: ${appDefinition.url}`);
                // Use dynamic import to load the module
                
                const module = await import(/* @vite-ignore */ appDefinition.url);
                console.log(`Module successfully loaded:`, module);
                
                // Store reference to the loaded module
                loadedModulesRef.current[activeFrameId] = module;
                
                // Prepare props based on the MFE type
                let customProps = {};
                if (appDefinition.id.startsWith('config-selector-')) {
                    const configType = appDefinition.id.replace('config-selector-', '');
                    
                    const handleMfeNavigateBack = () => {
                        console.log(`Shell: MFE (${appDefinition.id}) requested navigation back.`);
                        // Implement shell logic for navigation
                    };
                    
                    const handleMfeNavigateTo = (configId: string) => {
                        console.log(`Shell: MFE (${appDefinition.id}) requested navigation to config: ${configId}`);
                        // Implement shell logic for specific config navigation
                    };
                    
                    customProps = {
                        configType,
                        onNavigateBack: handleMfeNavigateBack,
                        onNavigateTo: handleMfeNavigateTo,
                        eventBus // Pass the eventBus instance
                    };
                } else {
                    // Default props for other MFEs
                    customProps = {
                        eventBus // Always pass the eventBus
                    };
                }
                
                // Render the component if the module exports a React component
                if (module.default && typeof module.default === 'function') {
                    const MfeComponent = module.default;
                    // Render the component into the container
                    ReactDOM.createRoot(containerRef.current).render(
                        <React.StrictMode>
                            <MfeComponent {...customProps} />
                        </React.StrictMode>
                    );
                } else if (module.mount && typeof module.mount === 'function') {
                    // If module exports a mount function (framework-agnostic)
                    module.mount(containerRef.current, customProps);
                } else {
                    console.error(`Module loaded but doesn't export expected interface:`, module);
                }
            } catch (err) {
                console.error(`Error loading microfrontend '${appDefinition.id}' from URL '${appDefinition.url}':`, err);
            }
        };
        
        // Mount the component when the ref is set and whenever activeFrameId changes
        const setContainerRef = (el: HTMLDivElement | null) => {
            containerRef.current = el;
            if (el) {
                loadModule();
            }
        };

        // Container div where the module will be mounted
        return (
          <ErrorBoundary message={`Error loading application: ${appDefinition.name}`}>
              <div ref={setContainerRef} id={`esm-module-${activeFrame.id}-${appDefinition.id}`} style={{height: '100%', width: '100%'}} />
          </ErrorBoundary>
        );
    };
    // --- End Helper Function ---

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
                pt: (theme) => theme?.mixins?.toolbar?.minHeight ? `${theme.mixins.toolbar.minHeight}px` : '64px',
                height: '100vh',
                boxSizing: 'border-box',
                borderRight: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper'
             }}>
                {/* Render TabBar */}
                {!loading && !error && config?.frames && config.frames.length > 0 ? (
                     <TabBar
                         frames={config.frames}
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
                <Toolbar /> {/* AppBar Spacer */}

                {/* Content Display Area */}
                 <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                     <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                         <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                              {renderActiveFrameContent()}
                         </Box>
                     </Box>
                 </Box>
            </Box>

            {/* Preferences Dialog */}
            <PreferencesDialog
                open={isPrefsDialogOpen}
                onClose={handleClosePrefsDialog}
             />
        </Box>
    );
}

// --- App Component (Wrapper) ---
function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ShellConfigProvider>
                <EventBusContext.Provider value={{ eventBus }}>
                    <Router>
                        <AppContent />
                    </Router>
                </EventBusContext.Provider>
             </ShellConfigProvider>
        </ThemeProvider>
    );
}

export default App;