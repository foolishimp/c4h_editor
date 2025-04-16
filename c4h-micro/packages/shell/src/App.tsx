// File: /Users/jim/src/apps/c4h_editor/c4h-micro/packages/shell/src/App.tsx

import React, { useEffect, useState, Suspense, useCallback } from 'react';
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
import { AppAssignment } from 'shared'; // Ensure AppDefinition is imported if needed by RemoteComponent props or logic
import { RemoteComponent } from 'shared';
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
   componentDidCatch(error: any, errorInfo: any) { console.error("ErrorBoundary caught:", error, errorInfo); }
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

    const handleOpenPrefsDialog = useCallback(() => {
        setIsPrefsDialogOpen(true);
    }, []);

    const handleClosePrefsDialog = useCallback(() => {
        setIsPrefsDialogOpen(false);
    }, []);

    // --- UPDATED useEffect Hook ---
    useEffect(() => {
        if (!loading && !error && config?.frames) {
            const sortedFrames = [...config.frames].sort((a, b) => a.order - b.order);
            const currentFrameExists = activeFrameId ? sortedFrames.some(f => f.id === activeFrameId) : false;

            // If no frames exist, set activeFrameId to null
            if (sortedFrames.length === 0) {
                 if (activeFrameId !== null) { // Only update if it's not already null
                    console.log("No frames available, setting activeFrameId to null.");
                    setActiveFrameId(null);
                }
            }
            // If the current activeFrameId is invalid (e.g., deleted) OR if no frame is active yet and frames exist
            else if (!currentFrameExists || !activeFrameId) {
                 const newActiveId = sortedFrames[0].id;
                 console.log(`Setting active frame. Reason: ${!currentFrameExists ? 'Current frame missing' : 'Initial load'}. New ID: ${newActiveId}`);
                 setActiveFrameId(newActiveId);
            }
            // Otherwise, the current activeFrameId is valid and exists, no change needed.
        } else if (!loading && !error && !config?.frames) {
             // Handle case where config is loaded but frames array is missing/null
             if (activeFrameId !== null) {
                 console.log("Config loaded but frames array is missing, setting activeFrameId to null.");
                 setActiveFrameId(null);
             }
        }
        // Dependency array includes activeFrameId to re-run check if it changes externally,
        // but the core logic prevents infinite loops by only setting state when needed.
    }, [config, loading, error, activeFrameId]);
    // --- END UPDATED useEffect ---


    const handleTabChange = (_event: React.SyntheticEvent, newFrameId: string) => { // Correctly typed _event
        setActiveFrameId(newFrameId);
    };

    // --- Helper function to render the content for the active frame ---
    const renderActiveFrameContent = () => {
        if (loading) {
             return <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
        }
        if (error) {
             // Display error state if config fetch failed significantly
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
            // This case should be less likely now due to the useEffect hook resetting activeFrameId
            console.warn(`No frame found for activeFrameId: ${activeFrameId}`);
            return <Typography sx={{ p: 3 }}>Frame not found or selected frame was removed.</Typography>;
        }
        if (!activeFrame.assignedApps || activeFrame.assignedApps.length === 0) {
            return <Typography sx={{ p: 3 }}>No application assigned to the '{activeFrame.name}' frame.</Typography>;
        }

        // Assuming one app per frame for now
        const assignment: AppAssignment = activeFrame.assignedApps[0];
        // Ensure availableApps exists before trying to find
        const appDefinition = config.availableApps?.find(app => app.id === assignment.appId);

        if (!appDefinition) {
             console.error(`App definition missing for app ID: ${assignment.appId}`);
             return <Typography color="error" sx={{ p: 3 }}>Error: Application definition not found for '{assignment.appId}'. Check Preferences Service configuration.</Typography>;
        }
         if (!appDefinition.url) {
             console.error(`URL missing in App definition for app ID: ${assignment.appId}`);
             return <Typography color="error" sx={{ p: 3 }}>Error: Application URL is missing for '{appDefinition.name}'. Cannot load microfrontend.</Typography>;
         }

        console.log(`Rendering RemoteComponent: scope=${appDefinition.scope}, module=${appDefinition.module}, url=${appDefinition.url}`);
        return (
            <ErrorBoundary message={`Error loading application: ${appDefinition.name}`}>
                <Suspense fallback={<Box sx={{display: 'flex', justifyContent: 'center', p:4}}><CircularProgress /></Box>}>
                    {/* Pass necessary props if RemoteComponent expects them */}
                    <RemoteComponent
                        url={appDefinition.url}
                        scope={appDefinition.scope}
                        module={appDefinition.module}
                        // props={{ someProp: 'value' }} // Example of passing props
                    />
                </Suspense>
            </ErrorBoundary>
        );
    };
    // --- End Helper Function ---

    const verticalTabBarWidth = 200;
    const jobsSidebarWidth = Math.round(350 * 1.3); // Consider making this dynamic or themed

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

            {/* Vertical TabBar / Sidebar */}
            {/* Ensure config and frames exist before rendering TabBar */}
            {!loading && !error && config?.frames && config.frames.length > 0 ? (
                 <TabBar
                     frames={config.frames}
                     activeFrameId={activeFrameId}
                     onTabChange={handleTabChange} // Pass the correctly typed handler
                     width={verticalTabBarWidth}
                 />
            ) : (
                 <Box sx={{ width: verticalTabBarWidth, flexShrink: 0, borderRight: 1, borderColor: 'divider', height: '100%', pt: '64px' }} >
                     {/* Show spinner only if loading, otherwise maybe a placeholder/message */}
                     {loading && <CircularProgress sx={{m: 2}} size={20}/>}
                     {!loading && !error && <Typography sx={{p:2, color: 'text.secondary'}}>No Tabs</Typography>}
                 </Box>
             )}

            {/* Main content area */}
            <Box component="main" sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Toolbar /> {/* AppBar Spacer */}

                {/* Content Display Area */}
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                     {/* Middle Content Area - Render outcome of helper function */}
                     <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                         <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                             {renderActiveFrameContent()}
                         </Box>
                     </Box>

                     {/* Right Jobs Sidebar Placeholder - Render only if config loaded successfully */}
                     {!loading && !error && config && (
                          <Box
                              sx={{
                                  width: `${jobsSidebarWidth}px`,
                                  flexShrink: 0,
                                  borderLeft: 1,
                                  borderColor: 'divider',
                                  height: '100%',
                                  overflowY: 'auto',
                                  p: 2,
                                  bgcolor: 'background.paper'
                              }}
                          >
                              <ErrorBoundary message="Error loading Jobs Sidebar">
                                  <Typography variant="h6" sx={{ mb: 2 }}>Jobs Placeholder</Typography>
                                  {/* Placeholder content or potentially another RemoteComponent */}
                              </ErrorBoundary>
                          </Box>
                     )}
                 </Box>
            </Box>

            {/* Render the Dialog */}
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