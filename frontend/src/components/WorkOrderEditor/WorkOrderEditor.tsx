// File: frontend/src/components/WorkOrderEditor/WorkOrderEditor.tsx
/**
 * WorkOrderEditor component for creating and editing work orders
 * This component handles the main editing interface with multiple tabs for different
 * configuration sections, YAML editing, and version history.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Tabs, Tab, Button, TextField, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert, Paper
} from '@mui/material';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'; // ES Module import for js-yaml

import { WorkOrder } from '../../types/workorder';
import { useWorkOrderApi } from '../../hooks/useWorkOrderApi';
import { useJobApi } from '../../hooks/useJobApi';
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
  const [yamlChanged, setYamlChanged] = useState<boolean>(false);
  const [pendingYaml, setPendingYaml] = useState<string | null>(null);
  
  // Access API hooks with required methods
  const {
    fetchWorkOrder,
    updateWorkOrder,
    createWorkOrder,
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
      try {
        // If we have pending YAML that hasn't been applied yet, don't overwrite it
        if (pendingYaml) {
          console.log("Keeping pending YAML instead of regenerating from workOrder");
          return;
        }

        // Extract intent configuration
        const intentConfig = {
          description: workOrder.metadata.description || '',
          goal: workOrder.metadata.goal || '',
          priority: workOrder.metadata.priority || 'medium',
          due_date: workOrder.metadata.due_date || null, // Use null instead of empty string
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
          orchestration: workOrder.template.config.workflow_id ? {
            service_id: workOrder.template.config.service_id,
            workflow_id: workOrder.template.config.workflow_id
          } : undefined,
          runtime: {
            max_runtime: workOrder.template.config.max_runtime,
            notify_on_completion: workOrder.template.config.notify_on_completion
          }
        };
        
        // Convert to YAML using imported function
        setIntentYaml(yamlDump(intentConfig, { indent: 2 }));
        setSystemYaml(yamlDump(systemConfig, { indent: 2 }));
        setYamlChanged(false);
      } catch (e) {
        console.error('Error converting to YAML:', e);
      }
    }
  }, [workOrder, pendingYaml]);

  const loadWorkOrder = async (id: string): Promise<void> => {
    setLoading(true);
    try {
      const result = await fetchWorkOrder(id);
      if (result) {
        // Clear any pending YAML when loading a work order
        setPendingYaml(null);
        
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
          max_tokens: 1000,
          stop_sequences: [], // Add the required stop_sequences property
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          service_id: null,
          workflow_id: null,
          max_runtime: null,
          notify_on_completion: false,
          parameters: {}
        }
      },
      metadata: {
        author: 'Current User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: '',
        tags: [],
        version: '1.0.0',
        due_date: null, // Initialize with null to avoid validation errors
        intent: null,
        goal: '',
        priority: 'medium',
        assignee: '',
        asset: '',
        target_model: ''
      },
      lineage: []
    };
    
    setWorkOrder(newWorkOrder);
    setOriginalWorkOrder(JSON.parse(JSON.stringify(newWorkOrder))); // Deep clone
    setPendingYaml(null); // Clear any pending YAML when creating a new work order
  };

  // These functions are called when the editor content changes
  const handleUpdateIntentYaml = (yaml: string): void => {
    console.log("Intent YAML updated");
    setIntentYaml(yaml);
    setPendingYaml(yaml); // Store the pending YAML to prevent it from being overwritten
    setYamlChanged(true);
  };

  const handleUpdateSystemYaml = (yaml: string): void => {
    console.log("System YAML updated");
    setSystemYaml(yaml);
    setPendingYaml(yaml); // Store the pending YAML to prevent it from being overwritten
    setYamlChanged(true);
  };

  const handleApplyIntentChanges = (parsedIntent: any): void => {
    if (!workOrder) return;
    
    console.log("Applying intent changes to work order:", parsedIntent);
    
    // Special case for when the user pastes a complete config
    // Look for common top-level keys to detect if this is a full config
    const isFullConfig = parsedIntent.project || 
                        parsedIntent.intent || 
                        parsedIntent.llm_config || 
                        parsedIntent.orchestration;
    
    if (isFullConfig) {
      // This is a complete pasted configuration
      console.log("Detected full configuration paste, handling specially");
      
      // Create an updated work order with the full config
      // We'll need to map the pasted structure to our work order structure
      const updatedWorkOrder = {
        ...workOrder,
        // Map metadata from various possible locations
        metadata: {
          ...workOrder.metadata,
          description: parsedIntent.intent?.description || parsedIntent.description || '',
          goal: parsedIntent.intent?.goal || parsedIntent.goal || '',
          priority: parsedIntent.intent?.priority || parsedIntent.priority || 'medium',
          due_date: parsedIntent.intent?.due_date || parsedIntent.due_date || null,
          assignee: parsedIntent.intent?.assignee || parsedIntent.assignee || '',
          asset: parsedIntent.project?.asset || parsedIntent.asset || '',
          // Keep existing tags if none in the pasted config
          tags: parsedIntent.project?.tags || parsedIntent.tags || workOrder.metadata.tags
        },
        template: {
          ...workOrder.template,
          // Extract parameters from various possible locations
          parameters: parsedIntent.intent?.parameters || 
                      parsedIntent.parameters || 
                      workOrder.template.parameters || [],
          // Map all the config settings
          config: {
            ...workOrder.template.config,
            // Handle the case where llm_config might be at the top level or nested
            ...(parsedIntent.llm_config || {}),
            // Extract service-specific settings
            service_id: parsedIntent.orchestration?.service_id || 
                        parsedIntent.service_id || 
                        workOrder.template.config.service_id,
            workflow_id: parsedIntent.orchestration?.workflow_id || 
                         parsedIntent.workflow_id || 
                         workOrder.template.config.workflow_id,
            // Extract runtime settings
            max_runtime: parsedIntent.runtime?.max_runtime || 
                         parsedIntent.max_runtime || 
                         workOrder.template.config.max_runtime,
            notify_on_completion: parsedIntent.runtime?.notify_on_completion || 
                                  parsedIntent.notify_on_completion || 
                                  workOrder.template.config.notify_on_completion
          }
        }
      };
      
      setWorkOrder(updatedWorkOrder);
    } else {
      // This is a standard intent-only YAML
      const updatedWorkOrder = {
        ...workOrder,
        metadata: {
          ...workOrder.metadata,
          description: parsedIntent.description || '',
          goal: parsedIntent.goal || '',
          priority: parsedIntent.priority || 'medium',
          // Handle due_date properly - convert empty string to null
          due_date: parsedIntent.due_date ? parsedIntent.due_date : null,
          assignee: parsedIntent.assignee || ''
        },
        template: {
          ...workOrder.template,
          parameters: parsedIntent.parameters || []
        }
      };
      
      setWorkOrder(updatedWorkOrder);
    }
    
    setYamlChanged(false); // Mark as applied
    setPendingYaml(null); // Clear pending YAML since we've applied it
  };

  const handleApplySystemChanges = (parsedSystem: any): void => {
    if (!workOrder) return;
    
    console.log("Applying system changes to work order:", parsedSystem);
    
    // Special case for when the user pastes a complete config
    // Look for common top-level keys to detect if this is a full config
    const isFullConfig = parsedSystem.project || 
                        parsedSystem.intent || 
                        parsedSystem.llm_config || 
                        parsedSystem.orchestration;
    
    if (isFullConfig) {
      // This is a complete pasted configuration, similar to above
      console.log("Detected full configuration paste in system tab, handling specially");
      
      const updatedWorkOrder = {
        ...workOrder,
        metadata: {
          ...workOrder.metadata,
          description: parsedSystem.intent?.description || workOrder.metadata.description,
          goal: parsedSystem.intent?.goal || workOrder.metadata.goal,
          priority: parsedSystem.intent?.priority || workOrder.metadata.priority,
          due_date: parsedSystem.intent?.due_date || workOrder.metadata.due_date,
          assignee: parsedSystem.intent?.assignee || workOrder.metadata.assignee,
          asset: parsedSystem.project?.asset || parsedSystem.asset || workOrder.metadata.asset,
          tags: parsedSystem.project?.tags || parsedSystem.tags || workOrder.metadata.tags
        },
        template: {
          ...workOrder.template,
          parameters: parsedSystem.intent?.parameters || workOrder.template.parameters,
          config: {
            ...workOrder.template.config,
            ...(parsedSystem.llm_config || {}),
            service_id: parsedSystem.orchestration?.service_id || 
                        parsedSystem.service_id || 
                        workOrder.template.config.service_id,
            workflow_id: parsedSystem.orchestration?.workflow_id || 
                         parsedSystem.workflow_id || 
                         workOrder.template.config.workflow_id,
            max_runtime: parsedSystem.runtime?.max_runtime || 
                         parsedSystem.max_runtime || 
                         workOrder.template.config.max_runtime,
            notify_on_completion: parsedSystem.runtime?.notify_on_completion || 
                                  parsedSystem.notify_on_completion || 
                                  workOrder.template.config.notify_on_completion
          }
        }
      };
      
      setWorkOrder(updatedWorkOrder);
    } else {
      // Standard system tab update with expected structure
      // Extract configuration from system YAML
      const llmConfig = parsedSystem.llm_config || {};
      const projectConfig = parsedSystem.project || {};
      const orchestrationConfig = parsedSystem.orchestration || {};
      const runtimeConfig = parsedSystem.runtime || {};
      
      const updatedWorkOrder = {
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
      };
      
      setWorkOrder(updatedWorkOrder);
    }
    
    setYamlChanged(false); // Mark as applied
    setPendingYaml(null); // Clear pending YAML since we've applied it
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

  const validateWorkOrder = (): boolean => {
    if (!workOrder) {
      setError("No work order to save");
      return false;
    }

    if (!workOrder.id.trim()) {
      setError("Work order ID is required");
      return false;
    }

    if (!workOrder.metadata.author.trim()) {
      setError("Author is required");
      return false;
    }

    // Ensure due_date is either null or a valid date
    if (workOrder.metadata.due_date === '') {
      // Set due_date to null if it's an empty string to avoid validation errors
      workOrder.metadata.due_date = null;
    }
    
    return true;
  };

  // Check if we need to apply YAML changes first before saving
  const applyYamlChangesIfNeeded = (): boolean => {
    if (!yamlChanged) return true;
    
    try {
      console.log("Applying YAML changes before save");
      // Try to parse the YAML based on current tab
      
      if (activeTab === 0 && intentYaml) {
        // Apply intent changes
        const parsedIntent = yamlLoad(intentYaml);
        handleApplyIntentChanges(parsedIntent);
        console.log("Applied intent YAML changes before save");
      } else if (activeTab === 1 && systemYaml) {
        // Apply system changes
        const parsedSystem = yamlLoad(systemYaml);
        handleApplySystemChanges(parsedSystem);
        console.log("Applied system YAML changes before save");
      }
      
      // Reset the changed flag since we've applied the changes
      setYamlChanged(false);
      
      return true;
    } catch (err) {
      setError(`Failed to parse YAML: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Failed to apply YAML changes:", err);
      return false;
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!workOrder) return;
    
    console.log("Saving work order. YAML changed:", yamlChanged);
    
    // First apply any pending YAML changes
    if (yamlChanged && !applyYamlChangesIfNeeded()) {
      console.error("Failed to apply YAML changes before saving");
      return;
    }
    
    if (!validateWorkOrder()) {
      return;
    }
    
    setLoading(true);
    try {
      console.log("Saving work order to backend:", workOrder);
      
      let result;
      
      // Check if this is a new work order or an update
      if (!id) {
        // Creating a new work order
        result = await createWorkOrder(workOrder);
      } else {
        // Updating an existing work order
        result = await updateWorkOrder(workOrder);
      }
      
      if (result) {
        console.log("Work order saved successfully:", result);
        
        // Update both local state references
        setWorkOrder(result);
        setOriginalWorkOrder(JSON.parse(JSON.stringify(result))); // Deep clone
        
        // Clear pending YAML since we've saved successfully
        setPendingYaml(null);
        
        setSaved(true);
        setYamlChanged(false);
        
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

    // First apply any pending YAML changes and save
    if (yamlChanged && !applyYamlChangesIfNeeded()) {
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

  const handleGetVersion = useCallback(async (versionHash: string) => {
    if (!id) {
      throw new Error("Work order ID is required");
    }
    
    try {
      // Use the version hash to fetch the specific version
      const result = await fetchWorkOrder(id);
      return result;
    } catch (err) {
      throw new Error(`Failed to get version: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [id, fetchWorkOrder]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number): void => {
    // If there are yaml changes in the current tab, ask to apply them before switching tabs
    if (yamlChanged) {
      try {
        if (activeTab === 0) {
          // Apply intent changes
          const parsedIntent = yamlLoad(intentYaml);
          handleApplyIntentChanges(parsedIntent);
        } else if (activeTab === 1) {
          // Apply system changes
          const parsedSystem = yamlLoad(systemYaml);
          handleApplySystemChanges(parsedSystem);
        }
      } catch (err) {
        setError(`Failed to apply changes before tab switch: ${err instanceof Error ? err.message : String(err)}`);
        // We'll still switch tabs but warn the user
      }
    }
    
    setActiveTab(newValue);
  };

  const handleCloseClick = (): void => {
    // Check if changes were made
    if (JSON.stringify(workOrder) !== JSON.stringify(originalWorkOrder) || yamlChanged) {
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
                onLoadVersion={handleGetVersion}
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