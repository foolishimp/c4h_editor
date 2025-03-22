// File: packages/job-management/src/JobManager.tsx
// Import React directly for explicit reference
import * as React from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';

/**
 * Simplified JobManager component
 * 
 * This component avoids complex hook usage and makes explicit references to React
 * to help diagnose federation issues.
 */
const JobManager = () => {
  console.log('JobManager rendering');
  console.log('React version:', React.version);
  
  // Use React.useState instead of the destructured version
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Use React.useEffect instead of the destructured version
  React.useEffect(() => {
    console.log('JobManager mounted');
    return () => {
      console.log('JobManager unmounted');
    };
  }, []);
  
  const handleIncrement = () => {
    setCount(prevCount => prevCount + 1);
  };
  
  const handleDecrement = () => {
    setCount(prevCount => prevCount - 1);
  };
  
  const handleSimulateLoading = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };
  
  const handleSimulateError = () => {
    setError('This is a simulated error');
  };
  
  const handleClearError = () => {
    setError(null);
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Job Management (Federation Test)
      </Typography>
      
      <Typography variant="body1" gutterBottom>
        This is a simplified JobManager component to verify that Module Federation is working correctly.
      </Typography>
      
      <Typography variant="body2" color="textSecondary" gutterBottom>
        React version: {React.version}
      </Typography>
      
      {error && (
        <Alert severity="error" onClose={handleClearError} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }} elevation={3}>
        <Typography variant="h6" gutterBottom>
          Counter: {count}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={handleIncrement}>
            Increment
          </Button>
          <Button variant="outlined" onClick={handleDecrement}>
            Decrement
          </Button>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3 }} elevation={3}>
        <Typography variant="h6" gutterBottom>
          Test Controls
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSimulateLoading}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Simulate Loading'}
          </Button>
          <Button 
            variant="contained" 
            color="warning" 
            onClick={handleSimulateError}
          >
            Simulate Error
          </Button>
        </Box>
      </Paper>
      
      <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0,0,0,0.05)' }}>
        <Typography variant="subtitle2">Module Federation Diagnostic Info:</Typography>
        <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
          {`React: ${typeof React}
useState: ${typeof React.useState}
useEffect: ${typeof React.useEffect}
Component: ${typeof React.Component}`}
        </pre>
      </Box>
    </Box>
  );
};

// Use default export for the component
export default JobManager;