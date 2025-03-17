/**
 * File: frontend/src/components/WorkOrderEditor/tabs/SystemConfigTab.tsx
 * 
 * System Configuration Tab component
 * Uses WorkOrderContext for state management
 */

import React from 'react';
import { useWorkOrderContext, ConfigSection } from '../../../contexts/WorkOrderContext';
import { ConfigurationEditor } from '../ConfigurationEditor';

// Example schema for documentation in the editor
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

const SystemConfigTab: React.FC = () => {
  const { 
    systemYaml, 
    updateYaml,
    applyYamlChanges,
    saveWorkOrder
  } = useWorkOrderContext();
  
  // Handle saving YAML changes
  const handleSave = () => {
    const success = applyYamlChanges(ConfigSection.SYSTEM);
    if (success) {
      saveWorkOrder();
    }
  };

  return (
    <ConfigurationEditor
      section={ConfigSection.SYSTEM}
      yaml={systemYaml}
      onChange={(yaml) => updateYaml(ConfigSection.SYSTEM, yaml)}
      onSave={handleSave}
      schemaExample={SYSTEM_SCHEMA}
      title="System Configuration"
      description="Configure the technical details of how the work order will be executed, including LLM settings, orchestration, and runtime configuration."
    />
  );
};

export default SystemConfigTab;