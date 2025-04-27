// File: /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/shell/src/App.tsx
/**
 * /packages/shell/src/App.tsx
 * Main shell application that orchestrates microfrontends
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
    ThemeProvider,
    CssBaseline,
    Box,
    CircularProgress,
    Typography,
} from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router } from 'react-router-dom';
// Refactored components and hooks
import MainLayout from './components/layout/MainLayout';
import { useMfeOrchestrator } from './hooks/useMfeOrchestrator';
import { useShellEvents } from './hooks/useShellEvents';
import { useShellConfig, ShellConfigProvider } from './contexts/ShellConfigContext';
import TabBar from './components/layout/TabBar';
// Import types from shared package
import { EventDetail, NavigationRequestPayload } from 'shared';
// Simplified imports
import PreferencesDialog from './components/preferences/PreferencesDialog';

// Theme definition
const theme = createTheme({
    palette: { primary: { main: '#1976d2' }, background: { default: '#f5f7fa' }, },
    typography: { fontFamily: ['-apple-system', 'sans-serif'].join(','), },
});

function AppContent() {
    const { config, loading: configLoading, error: configError, availableApps, layouts, isReady: isShellReady } = useShellConfig();

    const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
    const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
    const [isPrefsDialogOpen, setIsPrefsDialogOpen] = useState<boolean>(false);

    // Callbacks
    const handleConfigNavigation = useCallback((action: 'navigateTo' | 'back', target?: string) => {
        console.log(`AppContent: handleConfigNavigation called. Action=${action}, Target=${target}`);
        if (action === 'navigateTo' && target) setActiveConfigId(target);
        else if (action === 'back') setActiveConfigId(null);
    }, []);

    const handleNavigationRequest = useCallback((payload: NavigationRequestPayload) => {
        if (payload.action === 'navigateTo' || payload.action === 'back') handleConfigNavigation(payload.action, payload.target);
        else console.warn(`AppContent: Received unhandled navigation action: ${payload.action}`);
    }, [handleConfigNavigation]);

    const handleYamlEditRequest = useCallback((detail: EventDetail) => {
        console.log("AppContent: Received config:edit:yaml request:", detail);
        if (detail?.payload) { 
            const { configType, configId } = detail.payload; 
            alert(`YAML Editor requested for ${configType}:${configId}.`); 
        }
        else console.warn("AppContent: Invalid config:edit:yaml payload:", detail);
    }, []);

    // Hooks
    useShellEvents({ 
        onNavigationRequest: handleNavigationRequest, 
        onYamlEditRequest: handleYamlEditRequest 
    });
    
    const { MfeContainer } = useMfeOrchestrator({ 
        activeFrameId, 
        config, 
        availableApps, 
        layouts, 
        onConfigNavigate: handleConfigNavigation 
    });

    // Effect to set initial activeFrameId
    useEffect(() => {
        if (isShellReady && !configLoading && !configError && config?.frames) {
            const sortedFrames = [...config.frames].sort((a, b) => a.order - b.order);
            const currentFrameIsValid = activeFrameId ? sortedFrames.some(f => f.id === activeFrameId) : false;
            if (sortedFrames.length > 0 && (!activeFrameId || !currentFrameIsValid)) {
                console.log(`AppContent: Setting initial activeFrameId to ${sortedFrames[0].id}`);
                setActiveFrameId(sortedFrames[0].id);
            } else if (sortedFrames.length === 0 && activeFrameId !== null) {
                 console.log("AppContent: No frames configured, clearing activeFrameId.");
                 setActiveFrameId(null);
            }
        } else if (isShellReady && !configLoading && !configError && !config?.frames && activeFrameId !== null) {
             console.log("AppContent: Config loaded without frames, clearing activeFrameId.");
             setActiveFrameId(null);
        }
    }, [config, configLoading, configError, activeFrameId, isShellReady]);

    // Event Handlers
    const handleTabChange = useCallback((_event: React.SyntheticEvent, newFrameId: string) => {
        if (newFrameId !== activeFrameId) { setActiveFrameId(newFrameId); setActiveConfigId(null); }
    }, [activeFrameId]);
    const handleOpenPrefsDialog = useCallback(() => setIsPrefsDialogOpen(true), []);
    const handleClosePrefsDialog = useCallback(() => setIsPrefsDialogOpen(false), []);

    // --- Render Logic ---
    const renderSidebarContent = () => {
        if (configLoading) { 
            return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>; 
        }
        if (configError) { 
            return <Box sx={{ p: 2 }}><Typography color="error">Error</Typography></Box>; 
        }
        if (!config?.frames || config.frames.length === 0) { 
            return <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">No Tabs</Typography>
            </Box>; 
        }
        return <TabBar 
            frames={config.frames} 
            activeFrameId={activeFrameId} 
            onTabChange={handleTabChange} 
            width={verticalTabBarWidth} 
        />;
    };

    const verticalTabBarWidth = 200;
    // We need config (for frames), availableApps, and layouts for the orchestrator
    const isMfeAreaReady = !!(config && availableApps && layouts);

    console.log(`%%% AppContent RENDER: configLoading=${configLoading}, isMfeAreaReady=${isMfeAreaReady}`);

    return (
        <MainLayout
            sidebarWidth={verticalTabBarWidth}
            sidebarContent={renderSidebarContent()}
            mainContent={
                isMfeAreaReady
                    ? <MfeContainer />
                    : <Box sx={{p:3, textAlign: 'center'}}>
                        <CircularProgress />
                        <Typography sx={{mt: 1}}>
                            {configLoading ? 'Loading Configuration...' : 'Initializing...'}
                        </Typography>
                      </Box>
            }
            preferencesDialog={<PreferencesDialog open={isPrefsDialogOpen} onClose={handleClosePrefsDialog} />}
            onOpenPreferences={handleOpenPrefsDialog}
        />
    );
}

// App component
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