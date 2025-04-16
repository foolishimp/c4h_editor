import React from 'react'; // Removed unused: Suspense, lazy, useContext
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { createTheme } from '@mui/material/styles';
// Removed unused Router imports: Routes, Route, Navigate, useParams
import { BrowserRouter as Router } from 'react-router-dom';


// Removed static Navigation import
// Removed ConfigTypeSelector import
// Removed lazy imports for ConfigManager, JobManager

import { useShellConfig, ShellConfigProvider } from './contexts/ShellConfigContext'; // Correct context import

// Removed ConfigManagerWrapper - loading will be dynamic later
// Removed Loading component - using CircularProgress directly

// Create theme (keep as is)
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

// Error Boundary (keep as is)
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
   constructor(props: { children: React.ReactNode }) {
     super(props);
     this.state = { hasError: false, error: null };
   }
   static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
   componentDidCatch(error: any, errorInfo: any) { console.error("Error in component:", error, errorInfo); }
   render() {
     if (this.state.hasError) {
       return (
         <Box sx={{ p: 3, textAlign: 'center' }}>
           <h2>Something went wrong</h2>
           <p>There was an error loading this part of the application.</p>
           <pre>{this.state.error?.toString()}</pre>
           <button onClick={() => this.setState({ hasError: false, error: null })}>Try again</button>
           {' '}
           <button onClick={() => window.location.reload()}>Reload Page</button>
         </Box>
       );
     }
     return this.props.children;
   }
}


// Main App component logic - uses context
function AppContent() {
  const { config, loading, error } = useShellConfig(); // Use context
  const drawerWidth = 240; // Keep for placeholder layout
  const jobsSidebarWidth = Math.round(350 * 1.3); // Keep for placeholder layout

  // Removed useEffect for logging remotes - can be added back if needed

  return (
    // Router now wraps this component in App function below
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Placeholder for dynamic TabBar (WO-6) */}
      <Box sx={{ width: drawerWidth, flexShrink: 0, borderRight: '1px solid lightgray', pt: 8 }}>
        <Typography variant="h6" sx={{ p: 2 }}>Frames Placeholder</Typography>
        {/* Placeholder for frame list */}
      </Box>

       {/* Main area container */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100vh', overflow: 'hidden' }}>
           {/* Placeholder AppBar - TODO: integrate with dynamic tabs */}
          <Box sx={{ height: '64px', width: '100%', borderBottom: '1px solid lightgray', display: 'flex', alignItems: 'center', p: 2, flexShrink: 0 }}>
              <Typography variant='h6'>C4H Editor Shell</Typography>
          </Box>

           {/* Content Display Area */}
          <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                {/* Main Content Area */}
               <Box
                   component="main"
                   sx={{
                       flexGrow: 1,
                       height: 'calc(100vh - 64px)', // Adjust height based on AppBar/Tabs
                       display: 'flex', // Use flexbox for columns
                       overflow: 'hidden'
                   }}
               >
                   {/* --- Loading / Error / Content Logic --- */}
                   {loading && (
                       <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                           <CircularProgress />
                       </Box>
                   )}
                   {!loading && error && (
                       <Box sx={{ flexGrow: 1, p: 3 }}>
                           <Typography color="error">Error loading shell configuration:</Typography>
                           <Typography color="error" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{error}</Typography>
                       </Box>
                   )}
                   {!loading && !error && config && (
                       // Container for Middle + Right Sidebar Columns
                       <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'row', height: '100%', overflow: 'hidden' }}>
                           {/* Middle Area (potentially multiple panes later) */}
                           <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                               <Box sx={{ flexBasis: '100%', overflowY: 'auto', p: 3 }}> {/* Single pane for now */}
                                   <ErrorBoundary>
                                      {/* TODO: Replace with dynamic app loading based on active frame (WO-7) */}
                                      <Typography>Dynamic App Area (Active Frame Content)</Typography>
                                      {/* Example: <RemoteComponent scope={...} module={...} url={...} /> */}
                                   </ErrorBoundary>
                               </Box>
                               {/* Add more panes here if needed */}
                           </Box>

                           {/* Right Jobs Sidebar Placeholder */}
                           <Box
                               sx={{
                                   width: `${jobsSidebarWidth}px`,
                                   flexShrink: 0,
                                   borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
                                   height: '100%',
                                   overflowY: 'auto',
                                   p: 2
                               }}
                           >
                               <ErrorBoundary>
                                   <Typography variant="h6" sx={{ mb: 2 }}>Jobs Placeholder</Typography>
                                   {/* JobManager or other components might be loaded here dynamically later */}
                               </ErrorBoundary>
                           </Box>
                        </Box> // End Container for Middle + Right Sidebar
                   )} {/* End conditional rendering for loaded config */}
               </Box> {/* End Main Content Area */}
            </Box> {/* End Content Display Area */}
        </Box> {/* End main area container */}
    </Box> // End Root Flex container
  );
}

// Wrap AppContent with Providers in the main export
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Router should wrap the provider if context needs router info, */}
      {/* but here Provider loads config needed by AppContent which uses Router */}
      <ShellConfigProvider> {/* Provide context */}
        <Router> {/* Router wraps AppContent */}
           <AppContent /> {/* Render main content */}
        </Router>
      </ShellConfigProvider>
    </ThemeProvider>
  );
}

export default App;