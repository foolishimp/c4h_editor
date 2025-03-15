// File: frontend/src/components/WorkOrderEditor/WorkOrderEditor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Tabs, Tab, Button, TextField, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert, Paper
} from '@mui/material';

import { WorkOrder, WorkOrderMetadata, WorkOrderParameter } from '../../types/workorder';
import { useWorkOrderApi } from '../../hooks/useWorkOrderApi';
import { ConfigurationPanel } from './ConfigurationPanel';
import { WorkOrderParameterPanel } from './WorkOrderParameterPanel';
import { WorkOrderMetadataPanel } from './WorkOrderMetadataPanel';
import { WorkOrderTestRunner } from './WorkOrderTestRunner';
import { WorkOrderVersionControl } from './WorkOrderVersionControl';
import { YAMLEditor } from './YAMLEditor';

export interface WorkOrderEditorProps {
  workOrderId?: string;
  onSave?: (workOrder: WorkOrder) => void;
  onClose?: () => void;
}

export const WorkOrderEditor: React.FC<WorkOrderEditorProps> = ({
  workOrderId,
  onSave,
  onClose
}) => {
  // Router params
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  // Get the ID either from props or from URL params
  const id = workOrderId || params.id;
  
  // State management
  const [activeTab, setActiveTab] = useState<number>(0);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [originalWorkOrder, setOriginalWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const [confirmDiscard, setConfirmDiscard] = useState<boolean>(false);
  
  // Access API hooks with required methods
  const {
    fetchWorkOrder,
    updateWorkOrder,
    archiveWorkOrder,
    unarchiveWorkOrder,
    testWorkOrder,
    getWorkOrderHistory,
    renderWorkOrder
  } = useWorkOrderApi();

  // Load work order on component mount or workOrderId change
  useEffect(() => {
    if (id) {
      loadWorkOrder(id);
    } else {
      createNewWorkOrder();
    }
  }, [id]);

  const loadWorkOrder = async (id: string): Promise<void> => {
    setLoading(true);
    try {
      const result = await fetchWorkOrder(id);
      if (result) {
        setWorkOrder(result);
        setOriginalWorkOrder(JSON.parse(JSON.stringify(result))); // Deep clone
      } else {
        setError("Failed to load work order: Not found");
      }
    } catch (err) {
      setError(`Failed to load work order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const createNewWorkOrder = (): void => {
    const newWorkOrder: WorkOrder = {
      id: '',
      template: {
        text: '',
        parameters: [],
        config: {
          temperature: 0.7,
          max_tokens: 1000
        }
      },
      metadata: {
        author: 'Current User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: '',
        tags: [],
        version: '1.0.0'
      },
      lineage: []
    };
    
    setWorkOrder(newWorkOrder);
    setOriginalWorkOrder(JSON.parse(JSON.stringify(newWorkOrder))); // Deep clone
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!workOrder) return;
    
    setWorkOrder({
      ...workOrder,
      template: {
        ...workOrder.template,
        text: e.target.value
      }
    });
  };

  const handleUpdateParameters = useCallback((updatedParameters: WorkOrderParameter[]): void => {
    if (!workOrder) return;
    
    setWorkOrder({
      ...workOrder,
      template: {
        ...workOrder.template,
        parameters: updatedParameters
      }
    });
  }, [workOrder]);

  const handleUpdateMetadata = useCallback((updatedMetadata: WorkOrderMetadata): void => {
    if (!workOrder) return;
    
    setWorkOrder({
      ...workOrder,
      metadata: updatedMetadata
    });
  }, [workOrder]);

  const handleArchiveToggle = async (): Promise<void> => {
    if (!workOrder || !id) return;
    
    setLoading(true);
    try {
      const isArchived = workOrder.metadata.archived || false;
      if (isArchived) {
        await unarchiveWorkOrder(id);
      } else {
        await archiveWorkOrder(id);
      }
      
      // Reload the workorder to get updated state
      await loadWorkOrder(id);
    } catch (err) {
      setError(`Failed to ${workOrder.metadata.archived ? 'unarchive' : 'archive'} work order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!workOrder) return;
    
    setLoading(true);
    try {
      // Since we're updating, ensure we have an ID
      // For new work orders, this might be generated by the API
      if (!workOrder.id && !id) {
        throw new Error("Work order ID is required");
      }
      
      const result = await updateWorkOrder(workOrder);
      
      if (result) {
        setWorkOrder(result);
        setOriginalWorkOrder(JSON.parse(JSON.stringify(result))); // Deep clone
        setSaved(true);
        
        // If this is a new work order, navigate to its edit page
        if (!id && result.id) {
          navigate(`/workorders/${result.id}`);
        }
        
        if (onSave) {
          onSave(result);
        }
      } else {
        throw new Error("Failed to save work order");
      }
    } catch (err) {
      setError(`Failed to save work order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = useCallback(async (params: Record<string, any>): Promise<any> => {
    if (!workOrder || !id) {
      throw new Error("Work order not found or not saved");
    }
    
    try {
      return await testWorkOrder(id, params);
    } catch (err) {
      throw new Error(`Failed to test work order: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [workOrder, id, testWorkOrder]);

  const handleRender = useCallback(async (): Promise<string> => {
    if (!workOrder || !id) {
      throw new Error("Work order not found or not saved");
    }
    
    try {
      const response = await renderWorkOrder(id, {});
      return response.rendered_prompt || response.toString();
    } catch (err) {
      throw new Error(`Failed to render work order: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [workOrder, id, renderWorkOrder]);

  const handleGetHistory = useCallback(async () => {
    if (!id) {
      throw new Error("Work order ID is required");
    }
    
    try {
      return await getWorkOrderHistory(id);
    } catch (err) {
      throw new Error(`Failed to get history: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [id, getWorkOrderHistory]);

  const handleGetVersion = useCallback(async (versionId: string) => {
    if (!id) {
      throw new Error("Work order ID is required");
    }
    
    try {
      // In a real implementation, you might have a dedicated API method for this
      const result = await fetchWorkOrder(id);
      return result;
    } catch (err) {
      throw new Error(`Failed to get version: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [id, fetchWorkOrder]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

  const handleCloseClick = (): void => {
    // Check if changes were made
    if (JSON.stringify(workOrder) !== JSON.stringify(originalWorkOrder)) {
      setConfirmDiscard(true);
    } else if (onClose) {
      onClose();
    } else {
      navigate('/workorders');
    }
  };

  const handleConfirmDiscard = (): void => {
    setConfirmDiscard(false);
    if (onClose) {
      onClose();
    } else {
      navigate('/workorders');
    }
  };

  const handleCancelDiscard = (): void => {
    setConfirmDiscard(false);
  };

  const handleCloseNotification = (): void => {
    setError(null);
    setSaved(false);
  };

  // Fallback loading UI
  if (loading && !workOrder) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Fallback for missing workOrder
  if (!workOrder) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Failed to load work order. Please try again.
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">
          {id ? `Edit Work Order: ${workOrder.id}` : 'Create New Work Order'}
        </Typography>
        <Box>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
          <Button variant="outlined" onClick={handleCloseClick} sx={{ ml: 2 }}>
            Close
          </Button>
          {id && (
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleArchiveToggle} 
              sx={{ ml: 2 }}
              disabled={loading}
            >
              {workOrder.metadata.archived ? 'Unarchive' : 'Archive'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Work Order ID */}
      <TextField
        label="Work Order ID"
        fullWidth
        value={workOrder.id}
        onChange={(e) => setWorkOrder({ ...workOrder, id: e.target.value })}
        disabled={!!id} // Disable if editing existing
        margin="normal"
        variant="outlined"
        helperText="Unique identifier for this work order"
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Basic" />
          <Tab label="Intent" />
          <Tab label="Project" />
          <Tab label="LLM" />
          <Tab label="Orchestration" />
          <Tab label="Runtime" />
          <Tab label="Parameters" />
          <Tab label="Test Runner" />
          <Tab label="Versions" />
          <Tab label="YAML Editor" />
        </Tabs>
      </Box>

      {/* Basic Tab */}
      <Box role="tabpanel" hidden={activeTab !== 0} sx={{ mt: 3 }}>
        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Work Order Content
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={15}
              value={workOrder.template.text}
              onChange={handleTextChange}
              placeholder="Enter the work order text here..."
              variant="outlined"
            />
          </Box>
        )}
      </Box>

      {/* Intent Configuration Tab */}
      <Box role="tabpanel" hidden={activeTab !== 1} sx={{ mt: 3 }}>
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Intent Configuration
            </Typography>
            <ConfigurationPanel
              title="Intent"
              description="Define the purpose and goals of this work order"
              config={{
                description: workOrder.metadata.description || '',
                goal: workOrder.metadata.goal || '',
                priority: workOrder.metadata.priority || 'medium',
                due_date: workOrder.metadata.due_date || '',
                assignee: workOrder.metadata.assignee || ''
              }}
              onChange={(config) => handleUpdateMetadata({
                ...workOrder.metadata,
                description: config.description,
                goal: config.goal,
                priority: config.priority,
                due_date: config.due_date,
                assignee: config.assignee
              })}
            />
          </Box>
        )}
      </Box>

      {/* Project Configuration Tab */}
      <Box role="tabpanel" hidden={activeTab !== 2} sx={{ mt: 3 }}>
        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Project Configuration
            </Typography>
            <ConfigurationPanel
              title="Project Settings"
              description="Configure project-specific settings"
              config={{
                asset: workOrder.metadata.asset || '',
                tags: workOrder.metadata.tags || []
              }}
              onChange={(config) => handleUpdateMetadata({
                ...workOrder.metadata,
                asset: config.asset,
                tags: config.tags
              })}
            />
          </Box>
        )}
      </Box>

      {/* LLM Configuration Tab */}
      <Box role="tabpanel" hidden={activeTab !== 3} sx={{ mt: 3 }}>
        {activeTab === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              LLM Configuration
            </Typography>
            <ConfigurationPanel
              title="Language Model Settings"
              description="Configure the language model parameters"
              config={{
                target_model: workOrder.metadata.target_model || '',
                temperature: workOrder.template.config.temperature || 0.7,
                max_tokens: workOrder.template.config.max_tokens || 1000
              }}
              onChange={(config) => {
                handleUpdateMetadata({
                  ...workOrder.metadata,
                  target_model: config.target_model
                });
                
                setWorkOrder({
                  ...workOrder,
                  template: {
                    ...workOrder.template,
                    config: {
                      ...workOrder.template.config,
                      temperature: config.temperature,
                      max_tokens: config.max_tokens
                    }
                  }
                });
              }}
            />
          </Box>
        )}
      </Box>

      {/* Orchestration Configuration Tab */}
      <Box role="tabpanel" hidden={activeTab !== 4} sx={{ mt: 3 }}>
        {activeTab === 4 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Orchestration Configuration
            </Typography>
            <ConfigurationPanel
              title="Workflow Orchestration"
              description="Configure the execution workflow"
              config={{
                service_id: workOrder.template.config.service_id || '',
                workflow_id: workOrder.template.config.workflow_id || ''
              }}
              onChange={(config) => {
                setWorkOrder({
                  ...workOrder,
                  template: {
                    ...workOrder.template,
                    config: {
                      ...workOrder.template.config,
                      service_id: config.service_id,
                      workflow_id: config.workflow_id
                    }
                  }
                });
              }}
            />
          </Box>
        )}
      </Box>

      {/* Runtime Configuration Tab */}
      <Box role="tabpanel" hidden={activeTab !== 5} sx={{ mt: 3 }}>
        {activeTab === 5 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Runtime Configuration
            </Typography>
            <ConfigurationPanel
              title="Runtime Settings"
              description="Configure runtime behavior"
              config={{
                max_runtime: workOrder.template.config.max_runtime || 3600,
                notify_on_completion: workOrder.template.config.notify_on_completion || false
              }}
              onChange={(config) => {
                setWorkOrder({
                  ...workOrder,
                  template: {
                    ...workOrder.template,
                    config: {
                      ...workOrder.template.config,
                      max_runtime: config.max_runtime,
                      notify_on_completion: config.notify_on_completion
                    }
                  }
                });
              }}
            />
          </Box>
        )}
      </Box>

      {/* Parameters Tab */}
      <Box role="tabpanel" hidden={activeTab !== 6} sx={{ mt: 3 }}>
        {activeTab === 6 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Parameters
            </Typography>
            <WorkOrderParameterPanel
              parameters={workOrder.template.parameters}
              onUpdateParameters={handleUpdateParameters}
              disabled={false}
            />
          </Box>
        )}
      </Box>

      {/* Test Runner Tab */}
      <Box role="tabpanel" hidden={activeTab !== 7} sx={{ mt: 3 }}>
        {activeTab === 7 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Test Work Order
            </Typography>
            <Paper sx={{ p: 3 }}>
              <WorkOrderTestRunner
                workOrder={workOrder}
                onTest={handleTest}
                onRender={id ? handleRender : undefined}
              />
            </Paper>
          </Box>
        )}
      </Box>

      {/* Versions Tab */}
      <Box role="tabpanel" hidden={activeTab !== 8} sx={{ mt: 3 }}>
        {activeTab === 8 && id && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Version History
            </Typography>
            <Paper sx={{ p: 3 }}>
              <WorkOrderVersionControl
                workOrderId={id}
                onFetchHistory={handleGetHistory}
                onLoadVersion={(versionId) => handleGetVersion(versionId)}
                currentVersion={workOrder.metadata.version}
              />
            </Paper>
          </Box>
        )}
      </Box>

      {/* YAML Editor Tab */}
      <Box role="tabpanel" hidden={activeTab !== 9} sx={{ mt: 3 }}>
        {activeTab === 9 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              YAML Editor
            </Typography>
            <Paper sx={{ p: 3 }}>
              <YAMLEditor
                workOrder={workOrder}
                onChange={(updatedWorkOrder) => setWorkOrder(updatedWorkOrder)}
              />
            </Paper>
          </Box>
        )}
      </Box>

      {/* Notifications */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseNotification}>
        <Alert onClose={handleCloseNotification} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={saved} autoHideDuration={6000} onClose={handleCloseNotification}>
        <Alert onClose={handleCloseNotification} severity="success" sx={{ width: '100%' }}>
          Work order saved successfully!
        </Alert>
      </Snackbar>

      {/* Discard Changes Dialog */}
      <Dialog open={confirmDiscard} onClose={handleCancelDiscard}>
        <DialogTitle>Discard changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Are you sure you want to discard them?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDiscard}>Cancel</Button>
          <Button onClick={handleConfirmDiscard} color="error">Discard</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkOrderEditor;