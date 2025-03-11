import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme, Box, Typography, Paper } from "@mui/material";
import Navigation from "./components/common/Navigation";
import PromptLibrary from "./components/PromptLibrary/PromptLibrary";
import JobsList from "./components/JobsList/JobsList";
import JobDetails from "./components/JobDetails/JobDetails";
import WorkOrderEditor from "./components/WorkOrderEditor/WorkOrderEditor";

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#4299e1',
    },
    secondary: {
      main: '#48bb78',
    },
  },
});

// Debug component to help us figure out what's happening
function DebugInfo() {
  return (
    <Paper sx={{ padding: 3, margin: 2, backgroundColor: '#f8d7da' }}>
      <Typography variant="h4">Debug Information</Typography>
      <Typography variant="body1">
        If you're seeing this, the application is loading but there may be issues with the routing or components.
      </Typography>
      <Box mt={2}>
        <Typography variant="h6">Current Path: {window.location.pathname}</Typography>
        <Typography variant="h6">Available Routes:</Typography>
        <ul>
          <li>/prompts - PromptLibrary</li>
          <li>/prompts/:promptId - Specific prompt</li>
          <li>/workorders/:workOrderId - WorkOrderEditor</li>
          <li>/jobs - JobsList</li>
          <li>/jobs/:jobId - JobDetails</li>
        </ul>
      </Box>
    </Paper>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', height: '100vh' }}>
          <Navigation />
          <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px', ml: { md: '240px' }, width: { md: 'calc(100% - 240px)' } }}>
            <DebugInfo />
            <Routes>
              <Route path="/" element={<Navigate replace to="/prompts" />} />
              <Route path="/prompts" element={<PromptLibrary />} />
              <Route path="/prompts/:promptId" element={<PromptLibrary />} />
              <Route path="/workorders/:workOrderId" element={<WorkOrderEditor />} />
              <Route path="/jobs" element={<JobsList />} />
              <Route path="/jobs/:jobId" element={<JobDetails />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;