import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Tabs, Tab, TextField, FormControl, InputLabel, Select, MenuItem, Box, Paper, Typography, Chip, Grid, CircularProgress, Alert } from '@mui/material';
import { WorkOrder, WorkOrderStatus, WorkOrderType, WorkOrderConfig } from '../../types/workorder';
import { useWorkOrderApi } from '../../hooks/useWorkOrderApi';
import { useJobApi } from '../../hooks/useJobApi';
import MonacoEditor from '@monaco-editor/react';
import yaml from 'js-yaml';

const defaultConfig: WorkOrderConfig = {
  version: '1.0',
  type: WorkOrderType.STANDARD,
  resources: {
    cpu: '1',
    memory: '2Gi',
  },
  timeout: 3600,
  parameters: [],
};

const WorkOrderEditor: React.FC = () => {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { getWorkOrder, createWorkOrder, updateWorkOrder, loading, error } = useWorkOrderApi();
  const { createJob } = useJobApi();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [yamlConfig, setYamlConfig] = useState<string>('');
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('general');
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  useEffect(() => {
    const loadWorkOrder = async () => {
      if (workOrderId && workOrderId !== 'new') {
        try {
          const data = await getWorkOrder(workOrderId);
          setWorkOrder(data);
          // Convert config to YAML
          try {
            const yamlString = yaml.dump(data.config, { noRefs: true });
            setYamlConfig(yamlString);
          } catch (yamlErr) {
            setYamlError('Error converting config to YAML');
            console.error(yamlErr);
          }
        } catch (err) {
          console.error('Failed to load work order:', err);
        }
      } else {
        // Initialize new work order
        setWorkOrder({
          id: '',
          name: 'New Work Order',
          description: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'current-user', // This would be replaced with actual user info
          status: WorkOrderStatus.DRAFT,
          config: defaultConfig,
        } as WorkOrder);
        
        // Convert default config to YAML
        try {
          const yamlString = yaml.dump(defaultConfig, { noRefs: true });
          setYamlConfig(yamlString);
        } catch (yamlErr) {
          setYamlError('Error converting config to YAML');
          console.error(yamlErr);
        }
      }
    };

    loadWorkOrder();
  }, [workOrderId, getWorkOrder]);

  const handleYamlChange = (value: string | undefined) => {
    if (!value) return;

    setYamlConfig(value);
    setHasChanges(true);
    
    // Validate YAML syntax
    try {
      yaml.load(value);
      setYamlError(null);
    } catch (err) {
      setYamlError(`YAML syntax error: ${(err as Error).message}`);
    }
  };

  const handleGeneralFieldChange = (field: keyof WorkOrder, value: any) => {
    if (!workOrder) return;
    
    setWorkOrder({
      ...workOrder,
      [field]: value,
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!workOrder) return;

    try {
      // Convert YAML to config object
      let configObject: WorkOrderConfig;
      try {
        configObject = yaml.load(yamlConfig) as WorkOrderConfig;
      } catch (err) {
        setYamlError(`Cannot save: YAML syntax error: ${(err as Error).message}`);
        return;
      }

      const workOrderData = {
        name: workOrder.name,
        description: workOrder.description,
        promptId: workOrder.promptId,
        config: configObject,
        tags: workOrder.tags,
        status: workOrder.status,
      };

      let savedWorkOrder;
      if (workOrderId && workOrderId !== 'new') {
        savedWorkOrder = await updateWorkOrder(workOrderId, workOrderData);
      } else {
        savedWorkOrder = await createWorkOrder(workOrderData);
      }

      setWorkOrder(savedWorkOrder);
      setHasChanges(false);
      
      if (workOrderId === 'new') {
        navigate(`/workorders/${savedWorkOrder.id}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to save work order:', err);
    }
  };

  const handleSubmitJob = async () => {
    if (!workOrder?.id) return;

    try {
      const jobData = {
        workOrderId: workOrder.id,
        parameters: {}, // You could add parameters here
      };
      const job = await createJob(jobData);
      navigate(`/jobs/${job.id}`);
    } catch (err) {
      console.error('Failed to submit job:', err);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  if (loading && !workOrder) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m={2}>
        <Alert severity="error">Error loading work order: {error.message}</Alert>
      </Box>
    );
  }

  if (!workOrder) {
    return (
      <Box m={2}>
        <Alert severity="warning">No work order found</Alert>
      </Box>
    );
  }

  return (
    <Box m={2}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">
            {workOrderId === 'new' ? 'Create Work Order' : `Edit: ${workOrder.name}`}
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              sx={{ mr: 1 }} 
              onClick={() => navigate('/workorders')}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSave} 
              disabled={loading || !hasChanges || !!yamlError}
            >
              {loading ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          </Box>
        </Box>
        
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="work order tabs">
          <Tab label="General" value="general" />
          <Tab label="Configuration (YAML)" value="yaml" />
          <Tab label="Preview" value="preview" />
        </Tabs>
        
        {/* General Tab */}
        {activeTab === 'general' && (
          <Box mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={workOrder.name}
                  onChange={(e) => handleGeneralFieldChange('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={workOrder.description || ''}
                  onChange={(e) => handleGeneralFieldChange('description', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={workOrder.status}
                    label="Status"
                    onChange={(e) => handleGeneralFieldChange('status', e.target.value)}
                  >
                    {Object.values(WorkOrderStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tags (comma separated)"
                  value={workOrder.tags?.join(', ') || ''}
                  onChange={(e) => {
                    const tagsInput = e.target.value;
                    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
                    handleGeneralFieldChange('tags', tags);
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* YAML Configuration Tab */}
        {activeTab === 'yaml' && (
          <Box mt={2} height="60vh">
            {yamlError && (
              <Alert severity="error" sx={{ mb: 2 }}>{yamlError}</Alert>
            )}
            <MonacoEditor
              height="100%"
              language="yaml"
              value={yamlConfig}
              onChange={handleYamlChange}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </Box>
        )}
        
        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <Box mt={2}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" component="pre" sx={{
                whiteSpace: 'pre-wrap',
                backgroundColor: '#f5f5f5',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '50vh'
              }}>
                {JSON.stringify(workOrder, null, 2)}
              </Typography>
            </Paper>
            
            {workOrder.status === WorkOrderStatus.READY && (
              <Box mt={2} display="flex" justifyContent="center">
                <Button 
                  variant="contained" 
                  color="success" 
                  size="large"
                  onClick={handleSubmitJob}
                  disabled={loading}
                >
                  Submit Job
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default WorkOrderEditor;