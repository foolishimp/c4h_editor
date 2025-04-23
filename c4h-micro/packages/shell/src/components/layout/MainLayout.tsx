/**
 * /packages/shell/src/components/layout/MainLayout.tsx
 * Component responsible for the main application layout structure (AppBar, Sidebar, Content).
 */
import React from 'react';
import {
    Box,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

interface MainLayoutProps {
    sidebarContent: React.ReactNode; // Content for the sidebar (e.g., TabBar)
    mainContent: React.ReactNode; // Content for the main area (e.g., MFE container)
    preferencesDialog: React.ReactNode; // The preferences dialog component
    onOpenPreferences: () => void; // Callback to open preferences
    sidebarWidth: number; // Width of the sidebar
}

const MainLayout: React.FC<MainLayoutProps> = ({
    sidebarContent,
    mainContent,
    preferencesDialog,
    onOpenPreferences,
    sidebarWidth,
}) => {
    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Top AppBar */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'baseline' }}>
                        <Typography variant="h5" noWrap component="div" sx={{ mr: 2 }}>Visual Prompt Studio</Typography>
                        <Typography variant="subtitle1" noWrap component="div" sx={{ opacity: 0.8 }}>C4H Editor</Typography>
                    </Box>
                    <IconButton color="inherit" aria-label="open preferences" onClick={onOpenPreferences} edge="end">
                        <SettingsIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Sidebar Area */}
            <Box sx={{ width: sidebarWidth, flexShrink: 0, pt: `64px`, height: '100vh', boxSizing: 'border-box', borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                {sidebarContent}
            </Box>

            {/* Main Content Area */}
            <Box component="main" sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Toolbar /> {/* Spacer for AppBar */}
                <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                    {mainContent}
                </Box>
            </Box>

            {/* Preferences Dialog (rendered but controlled by parent state) */}
            {preferencesDialog}
        </Box>
    );
};

export default MainLayout;