import { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Button, 
  TextField, 
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { WorkOrder, WorkOrderParameter, ParameterType } from '../../types/workorder';
import useJobApi from '../../hooks/useJobApi';

interface WorkOrderTestRunnerProps {
  workOrder: WorkOrder;
  onTestComplete?: (result: any) => void;
}

export const WorkOrderTestRunner = ({ workOrder, onTestComplete }: WorkOrderTestRunnerProps) => {
  const [testParameters, setTestParameters] = useState<{ [key: string]: any }>({});
  const [testResults, setTestResults] = useState<any | null>(null);
  const [expanded, setExpanded] = useState<string | false>('parameters');
  const { submitJob, getJob, loading } = useJobApi();

  useEffect(() => {
    // Initialize test parameters with default values from workOrder
    const initialParams: { [key: string]: any } = {};
    workOrder.parameters.forEach(param => {
      initialParams[param.name] = param.default !== undefined ? param.default : getDefaultValueForType(param.type);
    });
    setTestParameters(initialParams);
  }, [workOrder.parameters]);

  const getDefaultValueForType = (type: ParameterType): any => {
    switch (type) {
      case ParameterType.STRING:
        return '';
      case ParameterType.NUMBER:
        return 0;
      case ParameterType.BOOLEAN:
        return false;
      case ParameterType.ARRAY:
        return '[]';
      case ParameterType.OBJECT:
        return '{}';
      default:
        return '';
    }
  };

  const handleParameterChange = (name: string, value: any) => {
    setTestParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleRunTest = async () => {
    try {
      // Parse string values to appropriate types
      const parsedParams: { [key: string]: any } = {};
      workOrder.parameters.forEach(param => {
        const value = testParameters[param.name];
        parsedParams[param.name] = parseValueForType(value, param.type);
      });
      
      // Submit the job to run the test
      const job = await submitJob({
        workorder_id: workOrder.id,
        parameters: parsedParams
      });
      
      if (job && job.id) {
        // Poll for job completion
        pollJobStatus(job.id);
      }
    } catch (error) {
      console.error("Error running test:", error);
      setTestResults({
        error: "Failed to run test. See console for details."
      });
      
      if (onTestComplete) {
        onTestComplete({
          error: "Failed to run test"
        });
      }
    }
  };

  const parseValueForType = (value: any, type: ParameterType): any => {
    try {
      switch (type) {
        case ParameterType.STRING:
          return String(value);
        case ParameterType.NUMBER:
          return Number(value);
        case ParameterType.BOOLEAN:
          return Boolean(value);
        case ParameterType.ARRAY:
        case ParameterType.OBJECT:
          return typeof value === 'string' ? JSON.parse(value) : value;
        default:
          return value;
      }
    } catch (e) {
      console.error(`Error parsing value for type ${type}:`, e);
      return value;
    }
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      const job = await getJob(jobId);
      
      if (job.status === 'completed') {
        setTestResults(job.result);
        setExpanded('results');
        
        if (onTestComplete) {
          onTestComplete(job.result);
        }
      } else if (job.status === 'failed') {
        setTestResults({
          error: job.error || "Job failed"
        });
        setExpanded('results');
        
        if (onTestComplete) {
          onTestComplete({
            error: job.error || "Job failed"
          });
        }
      } else {
        // If job is still running, poll again after 2 seconds
        setTimeout(() => pollJobStatus(jobId), 2000);
      }
    } catch (error) {
      console.error("Error polling job status:", error);
      setTestResults({
        error: "Failed to check job status"
      });
      
      if (onTestComplete) {
        onTestComplete({
          error: "Failed to check job status"
        });
      }
    }
  };

  const renderParameterInput = (param: WorkOrderParameter) => {
    const value = testParameters[param.name];
    
    switch (param.type) {
      case ParameterType.BOOLEAN:
        return (
          <TextField
            select
            fullWidth
            margin="normal"
            label={param.name}
            value={value ? "true" : "false"}
            onChange={(e) => handleParameterChange(param.name, e.target.value === "true")}
            helperText={param.description}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </TextField>
        );
      
      case ParameterType.NUMBER:
        return (
          <TextField
            type="number"
            fullWidth
            margin="normal"
            label={param.name}
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            helperText={param.description}
          />
        );
      
      case ParameterType.ARRAY:
      case ParameterType.OBJECT:
        return (
          <TextField
            fullWidth
            margin="normal"
            label={param.name}
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            helperText={param.description}
            multiline
            rows={3}
          />
        );
      
      case ParameterType.STRING:
      default:
        return (
          <TextField
            fullWidth
            margin="normal"
            label={param.name}
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            helperText={param.description}
          />
        );
    }
  };

  return (
    <Box className="test-runner">
      <Typography variant="h6" gutterBottom>
        Test Work Order
      </Typography>

      <Accordion 
        expanded={expanded === 'parameters'} 
        onChange={handleAccordionChange('parameters')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Test Parameters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {workOrder.parameters.length > 0 ? (
            <Box>
              {workOrder.parameters.map((param) => (
                <Box key={param.name}>
                  {renderParameterInput(param)}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography>This work order has no parameters to test.</Typography>
          )}
          
          <Box mt={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleRunTest}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Run Test'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion 
        expanded={expanded === 'results'} 
        onChange={handleAccordionChange('results')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Test Results</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={3}>
              <CircularProgress />
              <Typography ml={2}>Running test...</Typography>
            </Box>
          ) : testResults ? (
            testResults.error ? (
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffebee' }}>
                <Typography color="error">{testResults.error}</Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle2">Output:</Typography>
                    <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '300px' }}>
                      {typeof testResults.output === 'string' 
                        ? testResults.output 
                        : JSON.stringify(testResults.output, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
                
                {testResults.metrics && (
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                      <Typography variant="subtitle2">Metrics:</Typography>
                      <pre style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(testResults.metrics, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            )
          ) : (
            <Typography>No test results yet. Run a test to see results here.</Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};