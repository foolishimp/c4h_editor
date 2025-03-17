/**
 * File: frontend/src/components/WorkOrderEditor/tabs/IntentConfigTab.tsx
 * 
 * Intent Configuration Tab component
 * Uses WorkOrderContext for state management
 */

import React from 'react';
import { useWorkOrderContext, ConfigSection } from '../../../contexts/WorkOrderContext';
import { ConfigurationEditor } from '../ConfigurationEditor';

// Example schema for documentation in the editor
const INTENT_SCHEMA = {
  description: '',
  goal: '',
  priority: 'medium',
  due_date: '',
  assignee: '',
  parameters: []
};

const IntentConfigTab: React.FC = () => {
  const { 
    intentYaml, 
    updateYaml,
    applyYamlChanges,
    saveWorkOrder
  } = useWorkOrderContext();
  
  // Handle saving YAML changes
  const handleSave = () => {
    const success = applyYamlChanges(ConfigSection.INTENT);
    if (success) {
      saveWorkOrder();
    }
  };

  return (
    <ConfigurationEditor
      section={ConfigSection.INTENT}
      yaml={intentYaml}
      onChange={(yaml) => updateYaml(ConfigSection.INTENT, yaml)}
      onSave={handleSave}
      schemaExample={INTENT_SCHEMA}
      title="Intent Configuration"
      description="Define what you want to accomplish with this work order. This includes the goal, description, priority, and other intent-related information."
    />
  );
};

export default IntentConfigTab;