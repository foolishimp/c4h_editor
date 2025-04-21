// File: /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/shell/src/App.tsx
import React, { useEffect, useState, useCallback, useRef, useContext } from 'react';
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
import {
    eventBus,
    type AppDefinition,
    type FrameDefinition,
    type IframeMessage, 
    type EventDetail,
    type MFEType
} from 'shared';
import { useShellConfig, ShellConfigProvider, type ShellConfigContextState } from './contexts/ShellConfigContext';
import TabBar from './components/layout/TabBar';
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

// Helper function to load a module via ESM dynamic import
const loadModule = async (url: string): Promise<any> => {
  try {
    const module = await import(/* @vite-ignore */ url);
    return module.default || module;
  } catch (err) {
    console.error(`Error loading module from ${url}:`, err);
    throw err;
  }
};

// Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode, message?: string }, { hasError: boolean, error: Error | null }> {
   constructor(props: { children: React.ReactNode, message?: string }) {
     super(props);
     this.state = { hasError: false, error: null };
   }
   static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
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

// Create EventBus context
interface EventBusContextValue {
    eventBus: typeof eventBus;
}
const EventBusContext = React.createContext<EventBusContextValue | undefined>(undefined);

// Hook to access the event bus
export const useEventBus = () => {
    const context = useContext(EventBusContext);
    if (!context) {
        throw new Error('useEventBus must be used within EventBusProvider');
    }
    return context.eventBus;
};

// AppContent Component
function AppContent() {
    const { config, loading, error, availableApps } = useShellConfig();
    const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
    const [currentApp, setCurrentApp] = useState<AppDefinition | null>(null);
    const [isPrefsDialogOpen, setIsPrefsDialogOpen] = useState<boolean>(false);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const eventBusInstance = useEventBus();
    const loadedModulesRef = useRef<Record<string, any>>({});

    const handleOpenPrefsDialog = useCallback(() => {
        setIsPrefsDialogOpen(true);
    }, []);

    const handleClosePrefsDialog = useCallback(() => {
        setIsPrefsDialogOpen(false);
    }, []);

    // Effect to determine the current application based on activeFrameId
    useEffect(() => {
        if (activeFrameId && config?.frames && availableApps) {
            const activeFrame = config.frames.find((f: FrameDefinition) => f.id === activeFrameId);
            if (activeFrame?.assignedApps?.length) {
                const assignment = activeFrame.assignedApps[0];
                const appDef = availableApps.find((app: AppDefinition) => app.id === assignment.appId);
                setCurrentApp(appDef || null);
            } else {
                setCurrentApp(null);
            }
        } else {
            setCurrentApp(null);
        }
    }, [activeFrameId, config, availableApps]);

    // Initialize activeFrameId
    useEffect(() => {
        if (!loading && !error && config?.frames) {
            const sortedFrames = [...config.frames].sort((a, b) => a.order - b.order);
            const currentFrameExists = activeFrameId ? sortedFrames.some((f: FrameDefinition) => f.id === activeFrameId) : false;

            if (sortedFrames.length === 0) {
                if (activeFrameId !== null) setActiveFrameId(null);
            }
            else if (!currentFrameExists || !activeFrameId) {
                setActiveFrameId(sortedFrames[0].id);
            }
        } else if (!loading && !error && (!config?.frames || config.frames.length === 0)) {
            if (activeFrameId !== null) setActiveFrameId(null);
        }
    }, [config, loading, error, activeFrameId]);

    // Clean up ESM modules effect
    useEffect(() => {
        return () => {
            const previousModule = activeFrameId ? loadedModulesRef.current[activeFrameId] : null;
            if (previousModule && typeof previousModule.cleanup === 'function') {
                console.log(`Calling cleanup for module in frame: ${activeFrameId}`);
                previousModule.cleanup();
                if(activeFrameId) delete loadedModulesRef.current[activeFrameId];
            }
        };
    }, [activeFrameId]);

    // Set up iframe message bridge - handles messages FROM iframes TO the eventBus
    useEffect(() => {
        if (!currentApp || currentApp.type !== 'Iframe' || !currentApp.url) {
            return;
        }

        let expectedOrigin: string;
        try {
            expectedOrigin = new URL(currentApp.url).origin;
        } catch (e) {
            console.error(`Invalid URL for iframe origin derivation: ${currentApp.url}`);
            return;
        }

        const handleIframeMessage = (event: MessageEvent) => {
            if (event.origin !== expectedOrigin) {
                return;
            }

            const iframeMessage = event.data as IframeMessage;
            if (!iframeMessage || typeof iframeMessage.type !== 'string' || typeof iframeMessage.source !== 'string' || !Object.prototype.hasOwnProperty.call(iframeMessage, 'payload')) {
                console.warn('Shell received malformed message from iframe:', event.data);
                return;
            }

            console.log(`Shell: Bridge received message from iframe (${iframeMessage.source}):`, iframeMessage.type);

            const detailPayload: EventDetail = {
                source: `iframe:${iframeMessage.source}`, 
                payload: iframeMessage.payload
            };
            
            eventBusInstance.dispatchEvent(new CustomEvent(iframeMessage.type, {
                detail: detailPayload
            }));
        };

        window.addEventListener('message', handleIframeMessage);
        return () => {
            window.removeEventListener('message', handleIframeMessage);
        };
    }, [currentApp, eventBusInstance]);

    // Set up event bus subscriber to relay messages TO the active iframe
    useEffect(() => {
        if (!currentApp || currentApp.type !== 'Iframe' || !currentApp.url) {
            return;
        }

        let targetOrigin: string;
        try {
            targetOrigin = new URL(currentApp.url).origin;
        } catch (e) {
            console.error(`Invalid URL for iframe target origin derivation: ${currentApp.url}`);
            return;
        }

        const handleEventToForward = (event: Event) => {
            if (!(event instanceof CustomEvent) || !event.detail || typeof event.detail.source !== 'string' || !Object.prototype.hasOwnProperty.call(event.detail, 'payload')) {
                console.warn("Shell: Received internal event with invalid detail structure, cannot forward:", event);
                return;
            }
            const detail: EventDetail = event.detail;

            const iframe = iframeRef.current;
            if (!iframe || !iframe.contentWindow) {
                console.warn(`Cannot forward event to iframe: iframe reference or contentWindow not found`);
                return;
            }

            try {
                const message: IframeMessage = {
                    type: event.type,
                    source: detail.source,
                    payload: detail.payload
                };
                console.log(`Shell: Forwarding event to iframe (${currentApp.id}):`, message.type);
                iframe.contentWindow.postMessage(message, targetOrigin);
            } catch (err) {
                console.error(`Error forwarding event to iframe:`, err);
            }
        };

        const eventTypesToForward = ['chat:sendMessage', 'chat:provideContext']; 
        const listeners: { type: string; handler: EventListener }[] = [];

        eventTypesToForward.forEach((eventType) => {
            const handler = handleEventToForward as EventListener;
            eventBusInstance.addEventListener(eventType, handler);
            listeners.push({ type: eventType, handler });
        });

        return () => {
            listeners.forEach(({ type, handler }) => {
                eventBusInstance.removeEventListener(type, handler);
            });
        };
    }, [currentApp, eventBusInstance]);

    const handleTabChange = (_event: React.SyntheticEvent, newFrameId: string) => {
        setActiveFrameId(newFrameId);
    };

    // Helper function to render the content for the active frame
    const renderActiveFrameContent = () => {
        if (loading) {
            return <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
        }
        
        if (error) {
            return <Box sx={{ flexGrow: 1, p: 3 }}><Typography color="error">Error loading config: {error}</Typography></Box>;
        }
        
        if (!config || !config.frames || config.frames.length === 0) {
            return <Typography sx={{ p: 3, fontStyle: 'italic' }}>No frames configured.</Typography>;
        }
        
        if (!activeFrameId) {
            return <Typography sx={{ p: 3, fontStyle: 'italic' }}>Select a frame.</Typography>;
        }
        
        if (!currentApp) {
            const activeFrame = config.frames.find((f: FrameDefinition) => f.id === activeFrameId);
            return <Typography sx={{ p: 3 }}>
                {!activeFrame ? 'Frame not found' : 'No app assigned or app definition missing'} for this frame.
            </Typography>;
        }

        // Render based on MFE type
        switch (currentApp.type) {
            case 'Iframe':
                return (
                    <ErrorBoundary message={`Error loading iframe application: ${currentApp.name}`}>
                        <iframe
                            ref={iframeRef}
                            id={`iframe-${activeFrameId}-${currentApp.id}`}
                            src={currentApp.url}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            sandbox="allow-scripts allow-same-origin allow-forms"
                            title={currentApp.name}
                        />
                    </ErrorBoundary>
                );
                
            case 'ESM':
                // ESM Module Loader Component
                const EsmModuleLoader = ({ appDefinition, frameId }: { appDefinition: AppDefinition, frameId: string }) => {
                    const containerRef = useRef<HTMLDivElement | null>(null);
                    const isMountedRef = useRef(false);

                    useEffect(() => {
                        let root: ReactDOM.Root | null = null;
                        let unmountModule: (() => void) | null = null;
                        let cancelled = false;

                        const loadAndMount = async () => {
                            if (!containerRef.current || isMountedRef.current || !appDefinition.url || cancelled) return;
                            isMountedRef.current = true;
                            const currentContainer = containerRef.current;
                            currentContainer.innerHTML = '';

                            try {
                                // Use helper function to load the module
                                const module = await loadModule(appDefinition.url);
                                if (cancelled) return;
                                console.log(`Module successfully loaded:`, module);
                                loadedModulesRef.current[frameId] = module;

                                let customProps: any = { eventBus: eventBusInstance };
                                if (appDefinition.id.startsWith('config-selector-')) {
                                    const configType = appDefinition.id.replace('config-selector-', '');
                                    customProps = {
                                        ...customProps, configType,
                                        onNavigateBack: () => { if(!cancelled) console.log(`Shell: MFE (${appDefinition.id}) nav back`); },
                                        onNavigateTo: (id: string) => { if(!cancelled) console.log(`Shell: MFE (${appDefinition.id}) nav to ${id}`); }
                                    };
                                }

                                if (module.default && typeof module.default === 'function') {
                                    const MfeComponent = module.default;
                                    if(currentContainer && !cancelled){
                                        root = ReactDOM.createRoot(currentContainer);
                                        root.render(<MfeComponent {...customProps} />);
                                        unmountModule = () => {
                                            if (root) {
                                                root.unmount();
                                                console.log(`Unmounted MFE: ${appDefinition.id}`);
                                            }
                                        };
                                    } 
                                } else { 
                                    console.error("Module loaded but doesn't export expected interface:", module); 
                                }
                            } catch (err) {
                                if (!cancelled) {
                                    console.error(`Error loading microfrontend '${appDefinition.id}' from URL '${appDefinition.url}':`, err);
                                    if (currentContainer) {
                                        currentContainer.innerHTML = `<p style="color: red;">Failed to load ${appDefinition.name}.</p>`;
                                    }
                                }
                            }
                        };

                        loadAndMount();

                        return () => {
                            cancelled = true;
                            unmountModule?.();
                            const previousModule = loadedModulesRef.current[frameId];
                            if (previousModule && typeof previousModule.cleanup === 'function') {
                                previousModule.cleanup();
                            }
                            delete loadedModulesRef.current[frameId];
                            isMountedRef.current = false;
                        };
                    }, [appDefinition, frameId, eventBusInstance]);

                    return <div ref={containerRef} id={`esm-module-${frameId}-${appDefinition.id}`} style={{ height: '100%', width: '100%' }} />;
                };

                return (
                    <ErrorBoundary message={`Error loading application: ${currentApp.name}`}>
                        <EsmModuleLoader appDefinition={currentApp} frameId={activeFrameId} />
                    </ErrorBoundary>
                );
                
            case 'WebComponent':
                return <Typography sx={{ p: 3 }}>Web Component support coming soon.</Typography>;
                
            default:
                return <Typography sx={{ p: 3 }}>Unsupported application type: '{currentApp.type}'</Typography>;
        }
    };

    const verticalTabBarWidth = 200;

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* App Bar */}
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

            {/* Vertical TabBar / Sidebar */}
            <Box sx={{
                width: verticalTabBarWidth,
                flexShrink: 0,
                pt: `${theme.mixins.toolbar.minHeight || 64}px`,
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
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
                        {loading && <CircularProgress sx={{m: 2}} size={20}/>}
                        {!loading && !error && <Typography sx={{p:2, color: 'text.secondary'}}>No Tabs</Typography>}
                    </Box>
                )}
            </Box>

            {/* Main content area */}
            <Box component="main" sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Toolbar /> {/* AppBar Spacer */}
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, boxSizing: 'border-box' }}>
                            {renderActiveFrameContent()}
                        </Box>
                    </Box>
                </Box>
            </Box>
              
            <PreferencesDialog
                open={isPrefsDialogOpen}
                onClose={handleClosePrefsDialog}
            />
        </Box>
    );
}

// App Component (Wrapper)
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