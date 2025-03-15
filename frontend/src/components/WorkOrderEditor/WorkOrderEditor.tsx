// File: frontend/src/components/WorkOrderEditor/WorkOrderEditor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Tabs, Tab, Button, TextField, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert, Paper
} from '@mui/material';

import { WorkOrder, WorkOrderMetadata } from '../../types/workorder';
import { useWorkOrderApi } from '../../hooks/useWorkOrderApi';
import { useJobApi } from '../../hooks/useJobApi';
import { WorkOrderMetadataPanel } from './WorkOrderMetadataPanel';
import { WorkOrderVersionControl } from './WorkOrderVersionControl';
import { YAMLEditor } from './YAMLEditor';

// Define schemas for YAML editors
const INTENT_SCHEMA = {
  description: '',
  goal: '',
  priority: 'medium',
  due_date: '',
  assignee: '',
  parameters: []
};

const SYSTEM_SCHEMA = {
  llm_config: {
    providers: {
      anthropic: {
        api_base: "https://api.anthropic.com",
        env_var: "ANTHROPIC_API_KEY",
        default_model: "claude-3-5-sonnet-20241022"
      }
    },
    default_provider: "anthropic",
    agents: {
      discovery: {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0
      },
      solution_designer: {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0
      },
      coder: {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0
      }
    }
  },
  orchestration: {
    enabled: true,
    entry_team: "discovery"
  },
  runtime: {
    workflow: {
      storage: {
        enabled: true
      }
    }
  }
};

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
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const [confirmDiscard, setConfirmDiscard] = useState<boolean>(false);
  
  // YAML editor states
  const [intentYaml, setIntentYaml] = useState<string>('');
  const [systemYaml, setSystemYaml] = useState<string>('');
  
  // Access API hooks with required methods
  const {
    fetchWorkOrder,
    updateWorkOrder,
    archiveWorkOrder,
    unarchiveWorkOrder,
    getWorkOrderHistory
  } = useWorkOrderApi();

  const { submitJob } = useJobApi();

  // Load work order on component mount or workOrderId change
  useEffect(() => {
    if (id) {
      loadWorkOrder(id);
    } else {
      createNewWorkOrder();
    }
  }, [id]);

  // Update YAML content when workOrder changes
  useEffect(() => {
    if (workOrder) {
      // Extract intent configuration
      const intentConfig = {
        description: workOrder.metadata.description || '',
        goal: workOrder.metadata.goal || '',
        priority: workOrder.metadata.priority || 'medium',
        due_date: workOrder.metadata.due_date || '',
        assignee: workOrder.metadata.assignee || '',
        parameters: workOrder.template.parameters || []
      };
      
      // Extract system configuration (everything else)
      const systemConfig = {
        llm_config: workOrder.template.config,
        project: {
          asset: workOrder.metadata.asset || '',
          tags: workOrder.metadata.tags || []
        },
        // Add other system configuration properties as needed
        orchestration: workOrder.template.config.workflow_id ? {
          service_id: workOrder.template.config.service_id,
          workflow_id: workOrder.template.config.workflow_id
        } : undefined,
        runtime: {
          max_runtime: workOrder.template.config.max_runtime,
          notify_on_completion: workOrder.template.config.notify_on_completion
        }
      };
      
      // Convert to YAML
      try {
        // Use js-yaml but handle it safely
        const jsYaml = require('js-yaml');
        setIntentYaml(jsYaml.dump(intentConfig, { indent: 2 }));
        setSystemYaml(jsYaml.dump(systemConfig, { indent: 2 }));
      } catch (e) {
        console.error('Error converting to YAML:', e);
      }
    }
  }, [workOrder]);

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

  const handleUpdateIntentYaml = (yaml: string): void => {
    setIntentYaml(yaml);
  };

  const handleUpdateSystemYaml = (yaml: string): void => {
    setSystemYaml(yaml);
  };

  const handleApplyIntentChanges = (parsedIntent: any): void => {
    if (!workOrder) return;
    
    setWorkOrder({
      ...workOrder,
      metadata: {
        ...workOrder.metadata,
        description: parsedIntent.description || '',
        goal: parsedIntent.goal || '',
        priority: parsedIntent.priority || 'medium',
        due_date: parsedIntent.due_date || '',
        assignee: parsedIntent.assignee || ''
      },
      template: {
        ...workOrder.template,
        parameters: parsedIntent.parameters || []
      }
    });
  };

  const handleApplySystemChanges = (parsedSystem: any): void => {
    if (!workOrder) return;
    
    // Extract configuration from system YAML
    const llmConfig = parsedSystem.llm_config || {};
    const projectConfig = parsedSystem.project || {};
    const orchestrationConfig = parsedSystem.orchestration || {};
    const runtimeConfig = parsedSystem.runtime || {};
    
    setWorkOrder({
      ...workOrder,
      metadata: {
        ...workOrder.metadata,
        asset: projectConfig.asset || '',
        tags: projectConfig.tags || []
      },
      template: {
        ...workOrder.template,
        config: {
          ...workOrder.template.config,
          ...llmConfig,
          service_id: orchestrationConfig.service_id,
          workflow_id: orchestrationConfig.workflow_id,
          max_runtime: runtimeConfig.max_runtime,
          notify_on_completion: runtimeConfig.notify_on_completion
        }
      }
    });
  };

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

  const handleSubmitJob = async (): Promise<void> => {
    if (!workOrder || !workOrder.id) {
      setError("Please save the work order before submitting");
      return;
    }

    setSubmitting(true);
    try {
      // Make sure the work order is saved first
      await handleSave();
      
      // Then submit the job
      const result = await submitJob({ workOrderId: workOrder.id });
      
      if (result) {
        // Show success notification
        setSaved(true);
        // Navigate to jobs list to see the submitted job
        navigate('/jobs');
      } else {
        throw new Error("Failed to submit job");
      }
    } catch (err) {
      setError(`Failed to submit job: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

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
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSubmitJob} 
            disabled={loading || submitting || !workOrder.id}
            sx={{ mr: 2 }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit Work Order'}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={loading}
            sx={{ mr: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
          <Button variant="outlined" onClick={handleCloseClick} sx={{ mr: 2 }}>
            Close
          </Button>
          {id && (
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleArchiveToggle} 
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
          <Tab label="Intent Configuration" />
          <Tab label="System Configuration" />
          <Tab label="Versions" />
        </Tabs>
      </Box>

      {/* Intent Configuration Tab */}
      <Box role="tabpanel" hidden={activeTab !== 0} sx={{ mt: 3 }}>
        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Intent Configuration
            </Typography>
            <Paper sx={{ p: 3 }}>
              <Typography variant="body2" color="textSecondary" paragraph>
                Define what you want to accomplish with this work order. This includes the goal, description, priority, and other intent-related information.
              </Typography>
              <YAMLEditor
                workOrder={workOrder}
                initialYaml={intentYaml}
                onChange={handleUpdateIntentYaml}
                onApplyChanges={handleApplyIntentChanges}
                schemaExample={INTENT_SCHEMA}
                title="Intent Configuration"
              />
            </Paper>
          </Box>
        )}
      </Box>

      {/* System Configuration Tab */}
      <Box role="tabpanel" hidden={activeTab !== 1} sx={{ mt: 3 }}>
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              System Configuration
            </Typography>
            <Paper sx={{ p: 3 }}>
              <Typography variant="body2" color="textSecondary" paragraph>
                Configure the technical details of how the work order will be executed, including LLM settings, orchestration, and runtime configuration.
              </Typography>
              <YAMLEditor
                workOrder={workOrder}
                initialYaml={systemYaml}
                onChange={handleUpdateSystemYaml}
                onApplyChanges={handleApplySystemChanges}
                schemaExample={SYSTEM_SCHEMA}
                title="System Configuration"
              />
            </Paper>
          </Box>
        )}
      </Box>

      {/* Versions Tab */}
      <Box role="tabpanel" hidden={activeTab !== 2} sx={{ mt: 3 }}>
        {activeTab === 2 && id && (
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