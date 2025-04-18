// File: /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/shell/src/App.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react'; // Removed Suspense import
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
import { AppAssignment } from 'shared';
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
   // --- FIX: Added types for error and errorInfo ---
   componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
     console.error("ErrorBoundary caught:", error, errorInfo);
   }
   // --- END FIX ---
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

    // useEffect Hook for activeFrameId management (remains the same)
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
        // Store the current active ID to capture it for the cleanup function
        const previousActiveFrameId = activeFrameId;

        return () => {
            // Unmount the parcel associated with the FRAME WE ARE LEAVING
            const parcelToUnmount = mountedParcelsRef.current[previousActiveFrameId!]; // Use non-null assertion if confident activeFrameId was set
             if (parcelToUnmount && typeof parcelToUnmount.unmount === 'function') {
                console.log(`Unmounting parcel for previous frame: ${previousActiveFrameId}`);
                parcelToUnmount.unmount().catch((err: Error) => { // Add catch for unmount errors
                    console.error(`Error unmounting parcel for frame ${previousActiveFrameId}:`, err);
                });
                delete mountedParcelsRef.current[previousActiveFrameId!];
             }

             // Optional: Clean up all parcels if the main component unmounts entirely
             // This depends on whether AppContent itself can unmount. If it's always mounted,
             // cleaning up only the previous frame is sufficient.
            // If AppContent can unmount, uncomment the following:
            /*
            if (!activeFrameId) { // Check if triggered by component unmount (activeFrameId might be null then)
                Object.keys(mountedParcelsRef.current).forEach(frameId => {
                    const parcel = mountedParcelsRef.current[frameId];
                    if (parcel && typeof parcel.unmount === 'function') {
                        console.log(`Unmounting parcel for frame during component cleanup: ${frameId}`);
                        parcel.unmount().catch(err => console.error(`Cleanup Error unmounting parcel ${frameId}:`, err));
                    }
                    delete mountedParcelsRef.current[frameId];
                });
            }
            */
        };
    }, [activeFrameId]); // Re-run cleanup logic when activeFrameId changes

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
         // We no longer need appDefinition.url for SystemJS loading
         // if (!appDefinition.url) { ... } check removed

        console.log(`Preparing to mount Single-SPA parcel for app: ${appDefinition.id}`);

        // Mount function to be passed to the ref
        const mountParcel = (el: HTMLDivElement | null) => {
            if (!el || !(window as any).mountRootParcel || !activeFrameId) { // Also check activeFrameId
                console.error('Cannot mount parcel: DOM element, mountRootParcel, or activeFrameId not available', { el, mountFn: (window as any).mountRootParcel, activeFrameId });
                return;
            }

            // Load the parcel's lifecycle functions using SystemJS, identified by appDef.id
            const parcelConfig = () => (window as any).System.import(appDefinition.id)
              .catch((err: Error) => {
                 console.error(`Error loading microfrontend '${appDefinition.id}' via System.import:`, err);
                 // Optionally update UI state here to show a specific loading error
                 throw err; // Re-throw to be caught by ErrorBoundary if needed elsewhere
              });

            // Props to pass to the microfrontend
            const parcelProps = {
                domElement: el,
                name: appDefinition.name // Pass name or other relevant props
                // Add other props from appDefinition.props if applicable
             };

            // Unmount existing parcel *before* mounting new one, if necessary
            const existingParcel = mountedParcelsRef.current[activeFrameId];
            if (existingParcel) {
                console.log(`Unmounting existing parcel in frame ${activeFrameId} before mounting ${appDefinition.id}`);
                existingParcel.unmount().then(() => {
                    delete mountedParcelsRef.current[activeFrameId];
                    // Now mount the new one after ensuring the old one is gone
                    console.log(`Mounting new parcel for app: ${appDefinition.id} in frame: ${activeFrameId}`);
                    const parcel = (window as any).mountRootParcel(parcelConfig, parcelProps);
                    mountedParcelsRef.current[activeFrameId] = parcel;
                }).catch((unmountErr: Error) => {
                    console.error(`Error unmounting previous parcel for frame ${activeFrameId}:`, unmountErr);
                     // Decide if you still want to mount the new one despite the error
                     // For now, let's still try to mount the new one
                    console.log(`Attempting to mount new parcel for app: ${appDefinition.id} despite previous unmount error.`);
                    const parcel = (window as any).mountRootParcel(parcelConfig, parcelProps);
                    mountedParcelsRef.current[activeFrameId] = parcel;
                 });
            } else {
                 // No existing parcel for this frame, mount directly
                 console.log(`Mounting new parcel for app: ${appDefinition.id} in frame: ${activeFrameId}`);
                 const parcel = (window as any).mountRootParcel(parcelConfig, parcelProps);
                 mountedParcelsRef.current[activeFrameId] = parcel;
             }
        };

        // Container div where the parcel will be mounted
        return (
          <ErrorBoundary message={`Error loading application: ${appDefinition.name}`}>
              {/* The ref callback will handle the mounting */}
              <div ref={mountParcel} id={`single-spa-parcel-${activeFrame.id}-${appDefinition.id}`} style={{height: '100%', width: '100%'}} />
          </ErrorBoundary>
        );
    };
    // --- End Helper Function ---

    const verticalTabBarWidth = 200;
    // Removed unused jobsSidebarWidth

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
                // Calculate paddingTop dynamically based on theme, default to 64px
                pt: (theme) => theme?.mixins?.toolbar?.minHeight ? `${theme.mixins.toolbar.minHeight}px` : '64px',
                height: '100vh',
                boxSizing: 'border-box',
                borderRight: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper' // Added background color
            }}>
                {/* Render TabBar only when config is loaded and frames exist */}
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

                {/* Content Display Area - Takes full remaining width */}
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                     <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                         {/* Add padding around the content rendering area */}
                         <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                              {renderActiveFrameContent()}
                         </Box>
                     </Box>
                     {/* Removed the placeholder Jobs Sidebar */}
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