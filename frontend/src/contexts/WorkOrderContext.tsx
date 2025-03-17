/**
 * File: frontend/src/contexts/WorkOrderContext.tsx
 * 
 * Context provider for managing WorkOrder state across the application.
 * Handles synchronization between YAML representations and WorkOrder objects,
 * along with tracking changes, validation, and API interactions.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import { WorkOrder } from '../types/workorder';
import { useWorkOrderApi } from '../hooks/useWorkOrderApi';

// Define the sections of a WorkOrder that can be edited via YAML
export enum ConfigSection {
  INTENT = 'intent',
  SYSTEM = 'system'
}

// Context state interface
interface WorkOrderContextState {
  // Core state
  workOrder: WorkOrder | null;
  originalWorkOrder: WorkOrder | null;
  loading: boolean;
  error: string | null;
  saved: boolean;
  
  // YAML representations
  intentYaml: string;
  systemYaml: string;
  
  // Pending changes tracking
  pendingChanges: Record<ConfigSection, boolean>;
  hasUnsavedChanges: boolean;
  
  // Operations
  loadWorkOrder: (id: string) => Promise<void>;
  createNewWorkOrder: () => void;
  updateWorkOrderField: <K extends keyof WorkOrder>(field: K, value: WorkOrder[K]) => void;
  updateWorkOrderId: (id: string) => void;
  updateWorkOrderMetadata: <K extends keyof WorkOrder['metadata']>(field: K, value: any) => void;
  updateYaml: (section: ConfigSection, yaml: string) => void;
  applyYamlChanges: (section: ConfigSection) => boolean;
  saveWorkOrder: () => Promise<WorkOrder | null>;
  submitWorkOrder: () => Promise<any>;
  resetSavedState: () => void;
}

// Create the context with default values
const WorkOrderContext = createContext<WorkOrderContextState | undefined>(undefined);

// Provider component props
interface WorkOrderProviderProps {
  children: ReactNode;
}

// Empty work order template for new work orders
const emptyWorkOrder: WorkOrder = {
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
    goal: '',
    priority: 'medium',
    assignee: '',
    asset: '',
    target_model: '',
    due_date: null,
  },
  lineage: []
};

// Provider component
export const WorkOrderProvider: React.FC<WorkOrderProviderProps> = ({ children }) => {
  // API hooks
  const {
    fetchWorkOrder,
    updateWorkOrder,
    createWorkOrder,
    loading: apiLoading,
    error: apiError,
  } = useWorkOrderApi();
  
  // Core state
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [originalWorkOrder, setOriginalWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  
  // YAML state
  const [intentYaml, setIntentYaml] = useState<string>('');
  const [systemYaml, setSystemYaml] = useState<string>('');
  const [pendingChanges, setPendingChanges] = useState<Record<ConfigSection, boolean>>({
    [ConfigSection.INTENT]: false,
    [ConfigSection.SYSTEM]: false
  });
  
  // Compute if there are any unsaved changes
  const hasUnsavedChanges = React.useMemo(() => {
    if (!workOrder || !originalWorkOrder) return false;
    
    // Check for pending YAML changes
    if (pendingChanges[ConfigSection.INTENT] || pendingChanges[ConfigSection.SYSTEM]) {
      return true;
    }
    
    // Check for other changes by comparing current and original
    return JSON.stringify(workOrder) !== JSON.stringify(originalWorkOrder);
  }, [workOrder, originalWorkOrder, pendingChanges]);
  
  // Generate YAML from workOrder when it changes
  useEffect(() => {
    if (!workOrder) return;
    
    try {
      // Only update YAML if there are no pending changes in that section
      if (!pendingChanges[ConfigSection.INTENT]) {
        const intentConfig = {
          description: workOrder.metadata.description || '',
          goal: workOrder.metadata.goal || '',
          priority: workOrder.metadata.priority || 'medium',
          due_date: workOrder.metadata.due_date || null,
          assignee: workOrder.metadata.assignee || '',
          parameters: workOrder.template.parameters || []
        };
        setIntentYaml(yamlDump(intentConfig, { indent: 2 }));
      }
      
      if (!pendingChanges[ConfigSection.SYSTEM]) {
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
        setSystemYaml(yamlDump(systemConfig, { indent: 2 }));
      }
    } catch (e) {
      console.error('Error converting WorkOrder to YAML:', e);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [workOrder, pendingChanges]);
  
  // Load an existing work order
  const loadWorkOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchWorkOrder(id);
      
      if (result) {
        // Reset YAML change tracking when loading
        setPendingChanges({
          [ConfigSection.INTENT]: false,
          [ConfigSection.SYSTEM]: false
        });
        
        setWorkOrder(result);
        // Deep clone to preserve original state
        setOriginalWorkOrder(JSON.parse(JSON.stringify(result)));
      } else {
        setError("Failed to load work order: Not found");
      }
    } catch (err) {
      setError(`Failed to load work order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [fetchWorkOrder]);
  
  // Create a new empty work order
  const createNewWorkOrder = useCallback(() => {
    const newWorkOrder = { ...emptyWorkOrder };
    
    setWorkOrder(newWorkOrder);
    // Deep clone to preserve original state
    setOriginalWorkOrder(JSON.parse(JSON.stringify(newWorkOrder)));
    
    // Reset YAML change tracking for new work order
    setPendingChanges({
      [ConfigSection.INTENT]: false,
      [ConfigSection.SYSTEM]: false
    });
  }, []);
  
  // Update a specific field in the work order
  const updateWorkOrderField = useCallback(<K extends keyof WorkOrder>(field: K, value: WorkOrder[K]) => {
    setWorkOrder((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  }, []);
  
  // Special case for ID updates since they're common
  const updateWorkOrderId = useCallback((id: string) => {
    setWorkOrder((prev) => {
      if (!prev) return prev;
      return { ...prev, id };
    });
  }, []);
  
  // Update metadata fields
  const updateWorkOrderMetadata = useCallback(<K extends keyof WorkOrder['metadata']>(field: K, value: any) => {
    setWorkOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          [field]: value
        }
      };
    });
  }, []);
  
  // Update YAML content and mark as having pending changes
  const updateYaml = useCallback((section: ConfigSection, yaml: string) => {
    if (section === ConfigSection.INTENT) {
      setIntentYaml(yaml);
    } else {
      setSystemYaml(yaml);
    }
    
    // Mark this section as having pending changes
    setPendingChanges(prev => ({ ...prev, [section]: true }));
  }, []);
  
  // Apply YAML changes to the work order
  const applyYamlChanges = useCallback((section: ConfigSection): boolean => {
    if (!workOrder) return false;
    
    try {
      const yaml = section === ConfigSection.INTENT ? intentYaml : systemYaml;
      const parsed = yamlLoad(yaml) as any;
      
      // Create a new copy of the work order to avoid direct mutation
      const updatedWorkOrder = { ...workOrder };
      
      // Different mapping logic based on section
      if (section === ConfigSection.INTENT) {
        // Update metadata fields from intent YAML
        updatedWorkOrder.metadata = {
          ...updatedWorkOrder.metadata,
          description: parsed.description || '',
          goal: parsed.goal || '',
          priority: parsed.priority || 'medium',
          due_date: parsed.due_date === '' ? null : parsed.due_date,
          assignee: parsed.assignee || ''
        };
        
        // Update parameters
        updatedWorkOrder.template = {
          ...updatedWorkOrder.template,
          parameters: parsed.parameters || []
        };
      } else {
        // System configuration section
        const llmConfig = parsed.llm_config || {};
        const projectConfig = parsed.project || {};
        const orchestrationConfig = parsed.orchestration || {};
        const runtimeConfig = parsed.runtime || {};
        
        // Update metadata from project config
        updatedWorkOrder.metadata = {
          ...updatedWorkOrder.metadata,
          asset: projectConfig.asset || '',
          tags: projectConfig.tags || []
        };
        
        // Update template config
        updatedWorkOrder.template = {
          ...updatedWorkOrder.template,
          config: {
            ...updatedWorkOrder.template.config,
            ...llmConfig,
            service_id: orchestrationConfig.service_id,
            workflow_id: orchestrationConfig.workflow_id,
            max_runtime: runtimeConfig.max_runtime,
            notify_on_completion: runtimeConfig.notify_on_completion
          }
        };
      }
      
      // Update work order state
      setWorkOrder(updatedWorkOrder);
      
      // Mark this section as no longer having pending changes
      setPendingChanges(prev => ({ ...prev, [section]: false }));
      
      return true;
    } catch (err) {
      console.error(`Error parsing ${section} YAML:`, err);
      setError(`Failed to parse ${section} YAML: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }, [workOrder, intentYaml, systemYaml]);
  
  // Save the work order
  const saveWorkOrder = useCallback(async (): Promise<WorkOrder | null> => {
    if (!workOrder) {
      setError("No work order to save");
      return null;
    }
    
    // Validate work order fields
    if (!workOrder.id.trim()) {
      setError("Work order ID is required");
      return null;
    }
    
    if (!workOrder.metadata.author.trim()) {
      setError("Author is required");
      return null;
    }
    
    // Apply any pending YAML changes before saving
    let allChangesApplied = true;
    
    if (pendingChanges[ConfigSection.INTENT]) {
      allChangesApplied = applyYamlChanges(ConfigSection.INTENT) && allChangesApplied;
    }
    
    if (pendingChanges[ConfigSection.SYSTEM]) {
      allChangesApplied = applyYamlChanges(ConfigSection.SYSTEM) && allChangesApplied;
    }
    
    if (!allChangesApplied) {
      return null;
    }
    
    setLoading(true);
    
    try {
      // Clean up empty dates
      const cleanWorkOrder = {
        ...workOrder,
        metadata: {
          ...workOrder.metadata,
          due_date: workOrder.metadata.due_date === '' ? null : workOrder.metadata.due_date
        }
      };
      
      let result;
      
      if (originalWorkOrder && originalWorkOrder.id) {
        // Update existing work order
        result = await updateWorkOrder(cleanWorkOrder);
      } else {
        // Create new work order
        result = await createWorkOrder(cleanWorkOrder);
      }
      
      if (result) {
        setWorkOrder(result);
        setOriginalWorkOrder(JSON.parse(JSON.stringify(result)));
        
        // Reset YAML change tracking after saving
        setPendingChanges({
          [ConfigSection.INTENT]: false,
          [ConfigSection.SYSTEM]: false
        });
        
        setSaved(true);
        return result;
      } else {
        throw new Error("Failed to save work order");
      }
    } catch (err) {
      setError(`Failed to save work order: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [workOrder, originalWorkOrder, pendingChanges, applyYamlChanges, updateWorkOrder, createWorkOrder]);
  
  // Submit the work order as a job
  const submitWorkOrder = useCallback(async () => {
    if (!workOrder || !workOrder.id) {
      setError("Please save the work order before submitting");
      return null;
    }
    
    const savedWorkOrder = await saveWorkOrder();
    if (!savedWorkOrder) {
      return null;
    }
    
    // The actual submission happens in the component using this context
    return savedWorkOrder;
  }, [workOrder, saveWorkOrder]);
  
  // Reset the saved status flag
  const resetSavedState = useCallback(() => {
    setSaved(false);
  }, []);
  
  // Update error state from API errors
  useEffect(() => {
    if (apiError) {
      setError(apiError.message);
    }
  }, [apiError]);
  
  // Combine local and API loading states
  useEffect(() => {
    setLoading(apiLoading || loading);
  }, [apiLoading, loading]);
  
  // Context value
  const value: WorkOrderContextState = {
    workOrder,
    originalWorkOrder,
    loading,
    error,
    saved,
    intentYaml,
    systemYaml,
    pendingChanges,
    hasUnsavedChanges,
    loadWorkOrder,
    createNewWorkOrder,
    updateWorkOrderField,
    updateWorkOrderId,
    updateWorkOrderMetadata,
    updateYaml,
    applyYamlChanges,
    saveWorkOrder,
    submitWorkOrder,
    resetSavedState
  };
  
  return (
    <WorkOrderContext.Provider value={value}>
      {children}
    </WorkOrderContext.Provider>
  );
};

// Custom hook to use the context
export const useWorkOrderContext = (): WorkOrderContextState => {
  const context = useContext(WorkOrderContext);
  
  if (context === undefined) {
    throw new Error('useWorkOrderContext must be used within a WorkOrderProvider');
  }
  
  return context;
};