/**
 * /packages/shell/src/App.tsx
 * Main shell application that orchestrates microfrontends
 * --- Refactored to use MainLayout and custom hooks ---
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
// Ensure all needed types/values are imported from shared
import { AppDefinition, EventDetail, NavigationRequestPayload } from 'shared'; // Simplified imports
import PreferencesDialog from './components/preferences/PreferencesDialog';

// Theme definition
const theme = createTheme({
    palette: {
        primary: { main: '#1976d2' },
        // secondary: { main: '#dc004e' }, // Removed as not obviously used
        background: { default: '#f5f7fa' },
    },
    typography: {
        fontFamily: [
            '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif',
        ].join(','),
    },
});

function AppContent() {
    // --- Core State ---
    const { config, loading, error, availableApps } = useShellConfig();
    const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
    const [activeConfigId, setActiveConfigId] = useState<string | null>(null); // Used for config navigation state
    const [isPrefsDialogOpen, setIsPrefsDialogOpen] = useState<boolean>(false);
    // State related to MFE mounting (mountedModulesRef) is now inside useMfeOrchestrator
    // State/Refs related to event handling moved to useShellEvents

    // --- Callbacks ---
    // Callback for MFE Orchestrator hook & Shell Events hook to handle internal config navigation
    const handleConfigNavigation = useCallback((action: 'navigateTo' | 'back', target?: string) => {
        console.log(`AppContent: handleConfigNavigation called. Action=${action}, Target=${target}`);
        if (action === 'navigateTo' && target) {
            setActiveConfigId(target);
        } else if (action === 'back') {
            setActiveConfigId(null);
        }
    }, []); // No dependencies, relies on closure

    // Callback passed to useShellEvents for navigation requests
    const handleNavigationRequest = useCallback((payload: NavigationRequestPayload) => {
        // Only call handleConfigNavigation if the action is one it expects
        if (payload.action === 'navigateTo' || payload.action === 'back') {
            handleConfigNavigation(payload.action, payload.target);
        } else {
            // Optionally log or handle the unhandled 'forward' action
            console.warn(`AppContent: Received unhandled navigation action: ${payload.action}`);
        }
    }, [handleConfigNavigation]); // Dependency needed

    // Callback passed to useShellEvents for YAML Edit requests
    const handleYamlEditRequest = useCallback((detail: EventDetail) => {
        // --- TODO: Implement or move YAML edit request logic ---
        // This complex logic involving dynamic import and mounting of yaml-editor
        // might also belong in the useMfeOrchestrator or a dedicated hook/service.
        // For now, just logging it.
        console.log("AppContent: Received config:edit:yaml request (logic needs refactoring):", detail);
        if (detail?.payload) {
            const { configType, configId, frameId: requestedFrameId } = detail.payload;
            const frameId = requestedFrameId || activeFrameId;
            // Placeholder for the complex logic from original App.tsx lines ~499-518
             alert(`YAML Editor requested for ${configType}:${configId} in frame ${frameId}`);
        } else {
            console.warn("AppContent: Received config:edit:yaml request with invalid payload:", detail);
        }

    }, [activeFrameId]); // Dependency needed

    // --- Custom Hooks ---
    useShellEvents({ onNavigationRequest: handleNavigationRequest, onYamlEditRequest: handleYamlEditRequest });
    const { MfeContainer } = useMfeOrchestrator({
        activeFrameId,
        config,
        availableApps,
        onConfigNavigate: handleConfigNavigation // Pass navigation handler to orchestrator
    });

    // --- Effects and Callbacks (Simplified) ---
    useEffect(() => {
        // Effect to set the initial activeFrameId based on loaded config
        if (!loading && !error && config?.frames) {
            const sortedFrames = [...config.frames].sort((a, b) => a.order - b.order);
            const currentFrameIsValid = activeFrameId ? sortedFrames.some(f => f.id === activeFrameId) : false;

            if (sortedFrames.length > 0) {
                // Set initial frame only if none is active or the current one is no longer valid
                if (!activeFrameId || !currentFrameIsValid) {
                    console.log(`AppContent: Setting initial activeFrameId to ${sortedFrames[0].id}`);
                    setActiveFrameId(sortedFrames[0].id);
                }
            } else if (activeFrameId !== null) {
                // No frames configured, clear active frame
                console.log("AppContent: No frames configured, clearing activeFrameId.");
                setActiveFrameId(null);
            }
        } else if (!loading && !error && !config?.frames && activeFrameId !== null) {
                // Config loaded but has no frames array, clear active frame
                console.log("AppContent: Config loaded without frames, clearing activeFrameId.");
                setActiveFrameId(null);
            }
    }, [config, loading, error, activeFrameId]);
    // MFE cleanup is now handled within useMfeOrchestrator

    // Handler for tab changes
    const handleTabChange = useCallback((_event: React.SyntheticEvent, newFrameId: string) => {
        console.log(`App.tsx: handleTabChange called. New frame ID: ${newFrameId}`);
        if (newFrameId !== activeFrameId) {
            setActiveFrameId(newFrameId);
            setActiveConfigId(null); // Reset active config ID when changing tabs
        }
    }, [activeFrameId]);

    // Preferences dialog handlers
    const handleOpenPrefsDialog = useCallback(() => setIsPrefsDialogOpen(true), []);
    const handleClosePrefsDialog = useCallback(() => setIsPrefsDialogOpen(false), []);

    // --- Helper function to render sidebar content (TabBar) ---
    const renderSidebarContent = () => {
        // Handle loading state
        if (loading) {
            return (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <CircularProgress sx={{mb: 1}} size={20}/>
                    <Typography sx={{p:1, color: 'text.secondary', fontSize: '0.9rem'}}>Loading Tabs...</Typography>
                </Box>
            );
        }
        // Handle error state
        if (error) {
             return <Box sx={{ flexGrow: 1, p: 3 }}><Typography color="error">Error loading config: {error}</Typography></Box>;
        }
        // Handle no frames configured
        if (!config?.frames || config.frames.length === 0) {
             return (
                 <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                     <Typography sx={{p:1, color: 'text.secondary', fontSize: '0.9rem'}}>No Tabs Configured</Typography>
                     <Typography sx={{p:1, color: 'text.secondary', fontSize: '0.7rem'}}>(Use gear icon)</Typography>
                 </Box>
             );
        }

         // Render TabBar if frames exist
         return (
            <TabBar
                frames={config.frames}
                activeFrameId={activeFrameId}
                onTabChange={handleTabChange}
                width={verticalTabBarWidth} // Pass width
            />
         );
    };

    const verticalTabBarWidth = 200;

    // Render the main layout, passing required content and callbacks
    return (
        <MainLayout
            sidebarWidth={verticalTabBarWidth}
            sidebarContent={renderSidebarContent()}
            mainContent={<MfeContainer />} // Render the container component from the hook
            preferencesDialog={<PreferencesDialog open={isPrefsDialogOpen} onClose={handleClosePrefsDialog} />}
            onOpenPreferences={handleOpenPrefsDialog}
        />
    );
}

// Main App component wrapping everything with providers
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