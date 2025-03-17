// File: c4h-editor-micro/packages/config-editor/src/hooks/useConfigSection.ts
// Migrated from original frontend

/**
 * File: frontend/src/hooks/useConfigSection.ts
 * Custom hook for managing sections of the unified configuration
 */

// In frontend/src/hooks/useConfigSection.ts
// Add React import at the top

import React, { useState } from 'react';
import { WorkOrder } from 'shared';;
import { useWorkOrderContext } from '../contexts/WorkOrderContext';
import { useWorkOrderApi } from './useWorkOrderApi';
import { EditorTab, TabMetadata } from 'shared';;

// Helper for checking if a value is an object
export const isObject = (item: unknown): item is Record<string, unknown> => {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item));
};

// Deep merge utility
export const deepMerge = <T extends Record<string, any>, U extends Record<string, any>>(
  target: T, 
  source: U
): Record<string, any> => {
  const output = { ...target } as Record<string, any>;
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key] as Record<string, any>, source[key] as Record<string, any>);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
};

// Type definition for hook parameters
export interface ConfigSectionHookParams<T> {
  tab: EditorTab;
  metadata: TabMetadata;
  extractYaml: (workOrder: WorkOrder) => string;
  parseYaml: (yaml: string) => T | null;
  applyToWorkOrder: (workOrder: WorkOrder, config: T) => WorkOrder;
}

/**
 * Custom hook for editing a section of the unified work order configuration
 */
export function useConfigSection<T extends Record<string, any>>({
  tab,
  metadata,
  extractYaml,
  parseYaml,
  applyToWorkOrder
}: ConfigSectionHookParams<T>) {
  const { workOrder, loadWorkOrder } = useWorkOrderContext();
  const { updateWorkOrder } = useWorkOrderApi();
  
  // Local state
  const [yaml, setYaml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  
  // Initialize YAML when workOrder changes
  React.useEffect(() => {
    if (workOrder) {
      const initialYaml = extractYaml(workOrder);
      setYaml(initialYaml);
    }
  }, [workOrder, extractYaml]);
  
  // Update YAML content
  const updateYaml = (newYaml: string) => {
    setYaml(newYaml);
  };
  
  // Save changes
  const saveChanges = async () => {
    if (!workOrder) {
      setError('No work order loaded');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSaved(false);
    
    try {
      // Parse the YAML
      const config = parseYaml(yaml);
      if (!config) {
        setError('Failed to parse configuration');
        return;
      }
      
      console.log(`${tab} Tab: Parsed configuration:`, config);
      
      // Create a deep clone of the workOrder
      const updatedWorkOrder = JSON.parse(JSON.stringify(workOrder)) as WorkOrder;
      
      // Apply changes to the work order
      const finalWorkOrder = applyToWorkOrder(updatedWorkOrder, config);
      
      console.log(`${tab} Tab: Sending updated work order:`, finalWorkOrder);
      
      // Send to API
      const result = await updateWorkOrder(finalWorkOrder);
      
      if (result) {
        console.log(`${tab} Tab: Save successful:`, result);
        setSaved(true);
        
        // Reload the work order to get latest version
        if (workOrder.id) {
          await loadWorkOrder(workOrder.id);
        }
        
        // Hide success message after 3 seconds
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };
  
  return {
    workOrder,
    yaml,
    updateYaml,
    saveChanges,
    error,
    saving,
    saved,
    title: metadata.title,
    description: metadata.description,
    schemaExample: metadata.schemaExample
  };
}