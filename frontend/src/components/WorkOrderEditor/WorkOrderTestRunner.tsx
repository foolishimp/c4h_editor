// File: frontend/src/components/WorkOrderEditor/WorkOrderTestRunner.tsx
import React, { useState } from 'react';
import { Box, Button, Typography, TextField, CircularProgress, Paper } from '@mui/material';
import { WorkOrder } from '../../types/workorder';

interface WorkOrderTestRunnerProps {
  workOrder: WorkOrder;
  onTest: (parameters: Record<string, any>) => Promise<any>;
}

export const WorkOrderTestRunner: React.FC<WorkOrderTestRunnerProps> = ({ workOrder, onTest }) => {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParameterChange = (name: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await onTest(parameters);
      setResult(response.model_response || JSON.stringify(response, null, 2));
    } catch (err) {
      setError((err as Error).message || 'An error occurred during testing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>Test WorkOrder</Typography>
      
      {workOrder.template.parameters && workOrder.template.parameters.length > 0 && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>Parameters</Typography>
          {workOrder.template.parameters.map((param) => (
            <TextField
              key={param.name}
              label={param.name}
              placeholder={param.description || ''}
              value={parameters[param.name] || ''}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              margin="dense"
              size="small"
              fullWidth
              required={param.required}
              helperText={param.description}
            />
          ))}
        </Box>
      )}
      
      <Button 
        variant="contained" 
        onClick={handleTest}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Run Test'}
      </Button>
      
      {error && (
        <Box mt={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      
      {result && (
        <Box mt={3}>
          <Typography variant="subtitle2" gutterBottom>Result</Typography>
          <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result}</pre>
          </Paper>
        </Box>
      )}
    </Box>
  );
};