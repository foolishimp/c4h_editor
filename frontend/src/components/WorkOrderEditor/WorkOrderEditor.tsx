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
  Snackbar, Alert
} from '@mui/material';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';

import { WorkOrder } from '../../types/workorder';
import { useWorkOrderApi } from '../../hooks/useWorkOrderApi';
import { useJobApi } from '../../hooks/useJobApi';
import { WorkOrderVersionControl } from './WorkOrderVersionControl';
import { ConfigurationEditor, ConfigSection } from './ConfigurationEditor';

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
  const [yamlChanged, setYamlChanged] = useState<{
    [ConfigSection.INTENT]: boolean;
    [ConfigSection.SYSTEM]: boolean;
  }>({
    [ConfigSection.INTENT]: false,
    [ConfigSection.SYSTEM]: false
  });
  const [pendingYaml, setPendingYaml] = useState<{
    [ConfigSection.INTENT]: string | null;
    [ConfigSection.SYSTEM]: string | null;
  }>({
    [ConfigSection.INTENT]: null,
    [ConfigSection.SYSTEM]: null
  });
  
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
        // Skip if we have pending YAML
        if (pendingYaml[ConfigSection.INTENT] || pendingYaml[ConfigSection.SYSTEM]) {
          console.log("Keeping pending YAML instead of regenerating from workOrder");
          return;
        }

        // Extract intent configuration
        const intentConfig = {
          description: workOrder.metadata.description || '',
          goal: workOrder.metadata.goal || '',
          priority: workOrder.metadata.priority || 'medium',
          due_date: workOrder.metadata.due_date || null,
          assignee: workOrder.metadata.assignee || '',
          parameters: workOrder.template.parameters || []
        };
        
        // Extract system configuration
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
        
        // Reset changed flags
        setYamlChanged({
          [ConfigSection.INTENT]: false,
          [ConfigSection.SYSTEM]: false
        });
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
        setPendingYaml({
          [ConfigSection.INTENT]: null,
          [ConfigSection.SYSTEM]: null
        });
        
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
          stop_sequences: [], 
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
        due_date: null,
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
    
    // Clear any pending YAML when creating a new work order
    setPendingYaml({
      [ConfigSection.INTENT]: null,
      [ConfigSection.SYSTEM]: null
    });
  };

  // Handler for when YAML is edited in the editor
  const handleUpdateYaml = (section: ConfigSection, yaml: string): void => {
    console.log(`${section} YAML updated`);
    
    if (section === ConfigSection.INTENT) {
      setIntentYaml(yaml);
      setPendingYaml(prev => ({ ...prev, [ConfigSection.INTENT]: yaml }));
    } else {
      setSystemYaml(yaml);
      setPendingYaml(prev => ({ ...prev, [ConfigSection.SYSTEM]: yaml }));
    }
    
    setYamlChanged(prev => ({ ...prev, [section]: true }));
  };

  // Handler for applying changes from the editors
  const handleApplyChanges = (section: ConfigSection, parsedData: any): void => {
    if (!workOrder) return;
    
    console.log(`Applying ${section} changes to work order:`, parsedData);
    
    // Special case for when the user pastes a complete config
    // Look for common top-level keys to detect if this is a full config
    const isFullConfig = parsedData.project || 
                      parsedData.intent || 
                      parsedData.llm_config || 
                      parsedData.orchestration;
    
    let updatedWorkOrder: WorkOrder;
    
    if (isFullConfig) {
      // This is a complete pasted configuration
      console.log(`Detected full configuration paste in ${section} tab, handling specially`);
      
      updatedWorkOrder = {
        ...workOrder,
        metadata: {
          ...workOrder.metadata,
          description: parsedData.intent?.description || parsedData.description || workOrder.metadata.description || '',
          goal: parsedData.intent?.goal || parsedData.goal || workOrder.metadata.goal || '',
          priority: parsedData.intent?.priority || parsedData.priority || workOrder.metadata.priority || 'medium',
          due_date: parsedData.intent?.due_date || parsedData.due_date || workOrder.metadata.due_date,
          assignee: parsedData.intent?.assignee || parsedData.assignee || workOrder.metadata.assignee || '',
          asset: parsedData.project?.asset || parsedData.asset || workOrder.metadata.asset || '',
          tags: parsedData.project?.tags || parsedData.tags || workOrder.metadata.tags || []
        },
        template: {
          ...workOrder.template,
          parameters: parsedData.intent?.parameters || 
                      parsedData.parameters || 
                      workOrder.template.parameters || [],
          config: {
            ...workOrder.template.config,
            ...(parsedData.llm_config || {}),
            service_id: parsedData.orchestration?.service_id || 
                      parsedData.service_id || 
                      workOrder.template.config.service_id,
            workflow_id: parsedData.orchestration?.workflow_id || 
                       parsedData.workflow_id || 
                       workOrder.template.config.workflow_id,
            max_runtime: parsedData.runtime?.max_runtime || 
                       parsedData.max_runtime || 
                       workOrder.template.config.max_runtime,
            notify_on_completion: parsedData.runtime?.notify_on_completion || 
                                parsedData.notify_on_completion || 
                                workOrder.template.config.notify_on_completion
          }
        }
      };
    } else if (section === ConfigSection.INTENT) {
      // Standard intent tab update
      updatedWorkOrder = {
        ...workOrder,
        metadata: {
          ...workOrder.metadata,
          description: parsedData.description || '',
          goal: parsedData.goal || '',
          priority: parsedData.priority || 'medium',
          due_date: parsedData.due_date ? parsedData.due_date : null,
          assignee: parsedData.assignee || ''
        },
        template: {
          ...workOrder.template,
          parameters: parsedData.parameters || []
        }
      };
    } else {
      // Standard system tab update
      const llmConfig = parsedData.llm_config || {};
      const projectConfig = parsedData.project || {};
      const orchestrationConfig = parsedData.orchestration || {};
      const runtimeConfig = parsedData.runtime || {};
      
      updatedWorkOrder = {
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
    }
    
    setWorkOrder(updatedWorkOrder);
    setYamlChanged(prev => ({ ...prev, [section]: false }));
    setPendingYaml(prev => ({ ...prev, [section]: null }));
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
    // Check active tab first
    const currentSection = activeTab === 0 ? ConfigSection.INTENT : ConfigSection.SYSTEM;
    
    if (activeTab < 2 && yamlChanged[currentSection]) {
      try {
        console.log(`Applying ${currentSection} YAML changes before save`);
        
        // Try to parse the YAML based on current tab
        const yaml = currentSection === ConfigSection.INTENT ? intentYaml : systemYaml;
        const parsedData = yamlLoad(yaml);
        
        handleApplyChanges(currentSection, parsedData);
        console.log(`Applied ${currentSection} YAML changes before save`);
        
        return true;
      } catch (err) {
        setError(`Failed to parse ${currentSection} YAML: ${err instanceof Error ? err.message : String(err)}`);
        console.error(`Failed to apply ${currentSection} YAML changes:`, err);
        return false;
      }
    }
    
    // Check other tabs for pending changes
    const otherSection = currentSection === ConfigSection.INTENT ? ConfigSection.SYSTEM : ConfigSection.INTENT;
    
    if (yamlChanged[otherSection]) {
      try {
        console.log(`Applying ${otherSection} YAML changes before save (from non-active tab)`);
        
        // Try to parse the YAML from the other tab
        const yaml = otherSection === ConfigSection.INTENT ? intentYaml : systemYaml;
        const parsedData = yamlLoad(yaml);
        
        handleApplyChanges(otherSection, parsedData);
        console.log(`Applied ${otherSection} YAML changes before save`);
        
        return true;
      } catch (err) {
        setError(`Failed to parse ${otherSection} YAML: ${err instanceof Error ? err.message : String(err)}`);
        console.error(`Failed to apply ${otherSection} YAML changes:`, err);
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async (): Promise<void> => {
    if (!workOrder) return;
    
    console.log("Saving work order. YAML changed:", yamlChanged);
    
    // First apply any pending YAML changes
    if (!applyYamlChangesIfNeeded()) {
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
        setPendingYaml({
          [ConfigSection.INTENT]: null,
          [ConfigSection.SYSTEM]: null
        });
        
        setSaved(true);
        setYamlChanged({
          [ConfigSection.INTENT]: false,
          [ConfigSection.SYSTEM]: false
        });
        
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
    if (!applyYamlChangesIfNeeded()) {
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
    // If there are yaml changes in the current tab, apply them before switching tabs
    if (activeTab === 0 && yamlChanged[ConfigSection.INTENT]) {
      try {
        const parsedIntent = yamlLoad(intentYaml);
        handleApplyChanges(ConfigSection.INTENT, parsedIntent);
      } catch (err) {
        setError(`Failed to apply intent changes before tab switch: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (activeTab === 1 && yamlChanged[ConfigSection.SYSTEM]) {
      try {
        const parsedSystem = yamlLoad(systemYaml);
        handleApplyChanges(ConfigSection.SYSTEM, parsedSystem);
      } catch (err) {
        setError(`Failed to apply system changes before tab switch: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    setActiveTab(newValue);
  };

  const handleCloseClick = (): void => {
    // Check if changes were made
    const hasChanges = JSON.stringify(workOrder) !== JSON.stringify(originalWorkOrder) || 
                      yamlChanged[ConfigSection.INTENT] || 
                      yamlChanged[ConfigSection.SYSTEM];
                      
    if (hasChanges) {
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
          <ConfigurationEditor
            workOrder={workOrder}
            section={ConfigSection.INTENT}
            initialYaml={intentYaml}
            onChange={(yaml) => handleUpdateYaml(ConfigSection.INTENT, yaml)}
            onApplyChanges={(data) => handleApplyChanges(ConfigSection.INTENT, data)}
            onSave={handleSave}
            schemaExample={INTENT_SCHEMA}
            title="Intent Configuration"
            description="Define what you want to accomplish with this work order. This includes the goal, description, priority, and other intent-related information."
          />
        )}
      </Box>

      {/* System Configuration Tab */}
      <Box role="tabpanel" hidden={activeTab !== 1} sx={{ mt: 3 }}>
        {activeTab === 1 && (
          <ConfigurationEditor
            workOrder={workOrder}
            section={ConfigSection.SYSTEM}
            initialYaml={systemYaml}
            onChange={(yaml) => handleUpdateYaml(ConfigSection.SYSTEM, yaml)}
            onApplyChanges={(data) => handleApplyChanges(ConfigSection.SYSTEM, data)}
            onSave={handleSave}
            schemaExample={SYSTEM_SCHEMA}
            title="System Configuration"
            description="Configure the technical details of how the work order will be executed, including LLM settings, orchestration, and runtime configuration."
          />
        )}
      </Box>

      {/* Versions Tab */}
      <Box role="tabpanel" hidden={activeTab !== 2} sx={{ mt: 3 }}>
        {activeTab === 2 && id && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Version History
            </Typography>
            <Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 3 }}>
              <WorkOrderVersionControl
                workOrderId={id}
                onFetchHistory={handleGetHistory}
                onLoadVersion={handleGetVersion}
                currentVersion={workOrder.metadata.version}
              />
            </Box>
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