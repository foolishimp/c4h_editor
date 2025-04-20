// File: /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/shell/src/App.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react';
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

// --- AppContent Component ---
function AppContent() {
    const { config, loading, error } = useShellConfig();
    const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
    const [isPrefsDialogOpen, setIsPrefsDialogOpen] = useState<boolean>(false);
    const mountedParcelsRef = useRef<Record<string, any>>({});

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
        const previousActiveFrameId = activeFrameId;
        return () => {
            const parcelToUnmount = mountedParcelsRef.current[previousActiveFrameId!];
            if (parcelToUnmount && typeof parcelToUnmount.unmount === 'function') {
                console.log(`Unmounting parcel for previous frame: ${previousActiveFrameId}`);
                parcelToUnmount.unmount().catch((err: Error) => {
                    console.error(`Error unmounting parcel for frame ${previousActiveFrameId}:`, err);
                });
                delete mountedParcelsRef.current[previousActiveFrameId!];
            }
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

        // Mount function to be passed to the ref
        const mountParcel = (el: HTMLDivElement | null) => {
            if (!el || !(window as any).mountRootParcel || !activeFrameId) {
                console.error('Cannot mount parcel: DOM element, mountRootParcel, or activeFrameId not available', { el, mountFn: (window as any).mountRootParcel, activeFrameId });
                return;
            }

            // Load the parcel's lifecycle functions using the DYNAMIC URL from config service
            const parcelConfig = () => (window as any).System.import(appDefinition.url!) // Use non-null assertion as we checked above
              .catch((err: Error) => {
                 console.error(`Error loading microfrontend '${appDefinition.id}' from URL '${appDefinition.url}' via System.import:`, err);
                 throw err;
              });

            // --- UPDATED: Construct parcelProps with customProps nesting ---
            // Base props common to all parcels (or recognized by single-spa)
            const baseParcelProps: Record<string, any> = {
                domElement: el,
                name: appDefinition.name, // Optional: For debugging
            };

            // Prepare custom props specifically for config-selector
            let customPropsForMFE = {};
            if (appDefinition.id.startsWith('config-selector-')) {
                const configType = appDefinition.id.replace('config-selector-', '');

                const handleMfeNavigateBack = () => {
                    console.log(`Shell: MFE (${appDefinition.id}) requested navigation back.`);
                    // TODO: Implement shell logic for navigating back (e.g., update state, change route)
                };

                const handleMfeNavigateTo = (configId: string) => {
                    console.log(`Shell: MFE (${appDefinition.id}) requested navigation to config: ${configId}`);
                    // TODO: Implement shell logic for navigating to specific config (e.g., update state, change route)
                };

                customPropsForMFE = {
                    configType,
                    // configId: undefined, // Pass specific ID from shell state/route if needed
                    onNavigateBack: handleMfeNavigateBack,
                    onNavigateTo: handleMfeNavigateTo
                };
            }
             // --- END Construct parcelProps ---

            // Unmount existing parcel logic...
            const existingParcel = mountedParcelsRef.current[activeFrameId];
            if (existingParcel) {
                console.log(`Unmounting existing parcel in frame ${activeFrameId} before mounting ${appDefinition.id}`);
                existingParcel.unmount().then(() => {
                    delete mountedParcelsRef.current[activeFrameId];
                    console.log(`Mounting new parcel for app: ${appDefinition.id} in frame: ${activeFrameId}`);
                    // Mount with the combined standard and custom props
                    const parcel = (window as any).mountRootParcel(parcelConfig, { ...baseParcelProps, customProps: customPropsForMFE });
                    mountedParcelsRef.current[activeFrameId] = parcel;
                }).catch((unmountErr: Error) => {
                    console.error(`Error unmounting previous parcel for frame ${activeFrameId}:`, unmountErr);
                    console.log(`Attempting to mount new parcel for app: ${appDefinition.id} despite previous unmount error.`);
                    const parcel = (window as any).mountRootParcel(parcelConfig, { ...baseParcelProps, customProps: customPropsForMFE });
                    mountedParcelsRef.current[activeFrameId] = parcel;
                 });
            } else {
                 console.log(`Mounting new parcel for app: ${appDefinition.id} in frame: ${activeFrameId}`);
                 const parcel = (window as any).mountRootParcel(parcelConfig, { ...baseParcelProps, customProps: customPropsForMFE });
                 mountedParcelsRef.current[activeFrameId] = parcel;
             }
        };

        // Container div where the parcel will be mounted
        return (
          <ErrorBoundary message={`Error loading application: ${appDefinition.name}`}>
              <div ref={mountParcel} id={`single-spa-parcel-${activeFrame.id}-${appDefinition.id}`} style={{height: '100%', width: '100%'}} />
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