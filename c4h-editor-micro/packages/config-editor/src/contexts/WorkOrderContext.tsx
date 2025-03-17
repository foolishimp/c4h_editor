// File: c4h-editor-micro/packages/config-editor/src/contexts/WorkOrderContext.tsx
// Migrated from original frontend

/**
 * File: frontend/src/contexts/WorkOrderContext.tsx
 * 
 * Clean WorkOrder context that uses YAML as the primary editing interface.
 * Completely removes dual editing approach and technical debt.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import { WorkOrder, eventBus } from 'shared';
import { useWorkOrderApi } from '../hooks/useWorkOrderApi';

// Context state interface
interface WorkOrderContextState {
  // Core state
  workOrder: WorkOrder | null;
  originalWorkOrder: WorkOrder | null;
  loading: boolean;
  error: string | null;
  saved: boolean;
  
  // YAML representation
  yaml: string;
  hasUnsavedChanges: boolean;
  
  // Operations
  loadWorkOrder: (id: string) => Promise<void>;
  createNewWorkOrder: () => void;
  updateWorkOrderId: (id: string) => void;
  updateYaml: (yaml: string) => void;
  saveWorkOrder: () => Promise<WorkOrder | null>;
  submitWorkOrder: () => Promise<WorkOrder | null>;
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
    }
  },
  metadata: {
    author: 'Current User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: '',
    tags: [],
    version: '1.0.0',
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
  const [yaml, setYaml] = useState<string>('');
  const [yamlDirty, setYamlDirty] = useState<boolean>(false);
  
  // Compute if there are any unsaved changes
  const hasUnsavedChanges = React.useMemo(() => {
    if (yamlDirty) return true;
    if (!workOrder || !originalWorkOrder) return false;
    return JSON.stringify(workOrder) !== JSON.stringify(originalWorkOrder);
  }, [workOrder, originalWorkOrder, yamlDirty]);
  
  // Generate YAML from workOrder when it changes (but not if yaml is dirty)
  useEffect(() => {
    if (!workOrder || yamlDirty) return;
    
    try {
      const workOrderYaml = yamlDump(workOrder, { indent: 2 });
      setYaml(workOrderYaml);
    } catch (e) {
      console.error('Error converting WorkOrder to YAML:', e);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [workOrder, yamlDirty]);
  
  // Load an existing work order
  const loadWorkOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchWorkOrder(id);
      
      if (result) {
        setWorkOrder(result);
        // Deep clone to preserve original state
        setOriginalWorkOrder(JSON.parse(JSON.stringify(result)));
        // Reset YAML dirty state
        setYamlDirty(false);
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
    // Reset YAML dirty state
    setYamlDirty(false);
  }, []);
  
  // Special case for ID updates since they're needed for new work orders
  const updateWorkOrderId = useCallback((id: string) => {
    setWorkOrder((prev) => {
      if (!prev) return prev;
      return { ...prev, id };
    });
    
    // Mark YAML as dirty to regenerate it
    setYamlDirty(false);
  }, []);
  
  // Update YAML content directly
  const updateYaml = useCallback((newYaml: string) => {
    setYaml(newYaml);
    setYamlDirty(true);
  }, []);
  
  // Save the work order from YAML
  const saveWorkOrder = useCallback(async (): Promise<WorkOrder | null> => {
    if (!yaml) {
      setError("No YAML content to save");
      return null;
    }
    
    if (!yamlDirty && !workOrder) {
      setError("No work order to save");
      return null;
    }
    
    let workOrderToSave = workOrder;
    
    // If YAML is dirty, parse it to get the WorkOrder
    if (yamlDirty) {
      try {
        workOrderToSave = yamlLoad(yaml) as WorkOrder;
      } catch (err) {
        console.error('Error parsing YAML:', err);
        setError(`Failed to parse YAML: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }
    }
    
    if (!workOrderToSave) {
      setError("Failed to prepare work order for saving");
      return null;
    }
    
    // Validate work order fields
    if (!workOrderToSave.id.trim()) {
      setError("Work order ID is required");
      return null;
    }
    
    if (!workOrderToSave.metadata.author.trim()) {
      setError("Author is required");
      return null;
    }
    
    setLoading(true);
    
    try {
      // Clean up empty dates
      const cleanWorkOrder = {
        ...workOrderToSave,
        metadata: {
          ...workOrderToSave.metadata,
          due_date: workOrderToSave.metadata.due_date === '' ? null : workOrderToSave.metadata.due_date
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

      // Notify shell app about the save
      if (result) {
        eventBus.publish('workorder:saved', result);
      }
        setOriginalWorkOrder(JSON.parse(JSON.stringify(result)));
        setYamlDirty(false);
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
  }, [yaml, yamlDirty, workOrder, originalWorkOrder, updateWorkOrder, createWorkOrder]);
  
  // Submit the work order as a job
  const submitWorkOrder = useCallback(async () => {
    // Always save before submitting
    const savedWorkOrder = await saveWorkOrder();
    if (!savedWorkOrder) {
      return null;
    }
    
    // Return the saved work order for job submission
    return savedWorkOrder;
  }, [saveWorkOrder]);
  
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
    yaml,
    hasUnsavedChanges,
    loadWorkOrder,
    createNewWorkOrder,
    updateWorkOrderId,
    updateYaml,
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