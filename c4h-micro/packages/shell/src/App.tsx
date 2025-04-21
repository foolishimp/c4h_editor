/**
 * /packages/shell/src/App.tsx
 * Main application component that handles microfrontend loading and frame management
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
    const { config, loading, error } = useShellConfig();
    const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
    const [isPrefsDialogOpen, setIsPrefsDialogOpen] = useState<boolean>(false);
    const mountedModulesRef = useRef<Record<string, any>>({});

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

    // Clean up modules when activeFrameId changes or component unmounts
    useEffect(() => {
        const previousActiveFrameId = activeFrameId;
        return () => {
            const moduleToUnmount = mountedModulesRef.current[previousActiveFrameId!]; 
            if (moduleToUnmount && typeof moduleToUnmount.unmount === 'function') {
                console.log(`Unmounting module for previous frame: ${previousActiveFrameId}`);
                try {
                    moduleToUnmount.unmount();
                } catch (err) {
                    console.error(`Error unmounting module for frame ${previousActiveFrameId}:`, err);
                }
                delete mountedModulesRef.current[previousActiveFrameId!];
            }
        };
    }, [activeFrameId]);

    const handleTabChange = useCallback((_event: React.SyntheticEvent, newFrameId: string) => {
        setActiveFrameId(newFrameId);
    }, []);

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
        const appDef = config.availableApps?.find(app => app.id === assignment.appId);

        if (!appDef) {
             console.error(`App definition missing for app ID: ${assignment.appId}`);
             return <Typography color="error" sx={{ p: 3 }}>Error: Application definition not found for '{assignment.appId}'. Check configuration.</Typography>;
        }
        
        if (!appDef.url) {
             console.error(`URL missing for app ID: ${assignment.appId}`);
             return <Typography color="error" sx={{ p: 3 }}>Error: Application URL is missing for '{appDef.name}'. Cannot load microfrontend.</Typography>;
        }

        console.log(`Preparing to load ESM module for app: ${appDef.id} from URL: ${appDef.url}`);

        // Mount function to be passed to the ref
        const mountModule = (el: HTMLDivElement | null) => {
            if (!el || !activeFrameId) {
                console.error('Cannot mount module: DOM element or activeFrameId not available', { el, activeFrameId });
                return;
            }

            // Unmount existing module if any
            const existingModule = mountedModulesRef.current[activeFrameId];
            if (existingModule) {
                console.log(`Unmounting existing module in frame ${activeFrameId}`);
                if (typeof existingModule.unmount === 'function') {
                    try {
                        existingModule.unmount();
                    } catch (err) {
                        console.error(`Error unmounting previous module for frame ${activeFrameId}:`, err);
                    }
                }
                delete mountedModulesRef.current[activeFrameId];
            }

            // Load and mount the module using dynamic import
            console.log(`Loading module from URL: ${appDef.url}`);
            import(/* @vite-ignore */ appDef.url).then(module => {
                console.log(`Module loaded successfully from ${appDef.url}`, module);
                
                // Create props for the microfrontend including event bus
                const props = {
                    domElement: el,
                    name: appDef.name,
                    eventBus: eventBus // Pass event bus to all MFEs
                };
                
                // Add additional props for specific app types
                if (appDef.id.startsWith('config-selector-')) {
                    const configType = appDef.id.replace('config-selector-', '');
                    Object.assign(props, {
                        configType,
                        onNavigateBack: () => {
                            console.log(`Shell: MFE (${appDef.id}) requested navigation back.`);
                            // Dispatch navigation event if needed
                            eventBus.publish('navigation:request', {
                                source: 'shell',
                                payload: { action: 'back', from: appDef.id }
                            });
                        },
                        onNavigateTo: (configId: string) => {
                            console.log(`Shell: MFE (${appDef.id}) requested navigation to config: ${configId}`);
                            // Dispatch navigation event if needed
                            eventBus.publish('navigation:request', {
                                source: 'shell',
                                payload: { action: 'navigateTo', target: configId, from: appDef.id }
                            });
                        }
                    });
                }
                
                try {
                    // Handle different module export patterns
                    if (module.mount && typeof module.mount === 'function') {
                        // Handle single-spa compatible modules
                        const mountedModule = module.mount(props);
                        mountedModulesRef.current[activeFrameId] = mountedModule;
                    } else if (module.default && typeof module.default === 'function') {
                        // Handle React component default exports
                        const ReactComponent = module.default;
                        const reactRoot = ReactDOM.createRoot(el);
                        reactRoot.render(
                            <ReactComponent {...props} />
                        );
                        
                        // Store unmount function
                        mountedModulesRef.current[activeFrameId] = {
                            unmount: () => {
                                reactRoot.unmount();
                            }
                        };
                    } else {
                        console.error(`Module from ${appDef.url} doesn't export expected interface`);
                    }
                } catch (err) {
                    console.error(`Error mounting module from ${appDef.url}:`, err);
                }
            }).catch(err => {
                console.error(`Error dynamically importing module from ${appDef.url}:`, err);
            });
        };

        // Container div where the module will be mounted
        return (
          <ErrorBoundary message={`Error loading application: ${appDef.name}`}>
              <div ref={mountModule} id={`esm-module-${activeFrame.id}-${appDef.id}`} style={{height: '100%', width: '100%'}} />
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
                <Router>
                    <AppContent />
                </Router>
             </ShellConfigProvider>
        </ThemeProvider>
    );
}

export default App;