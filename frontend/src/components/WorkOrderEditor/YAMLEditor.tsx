// File: frontend/src/components/WorkOrderEditor/YAMLEditor.tsx
import React, { useState, useEffect } from 'react';
import { Box, Button, Alert } from '@mui/material';
import { WorkOrder } from '../../types/workorder';
import Editor from '@monaco-editor/react';
import * as yaml from 'js-yaml';

interface YAMLEditorProps {
  workOrder: WorkOrder;
  onChange: (workOrder: WorkOrder) => void;
}

export const YAMLEditor: React.FC<YAMLEditorProps> = ({ workOrder, onChange }) => {
  const [yamlContent, setYamlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Convert WorkOrder to YAML when the workOrder changes
  useEffect(() => {
    try {
      if (workOrder) {
        const workOrderObj = {
          id: workOrder.id,
          template: {
            text: workOrder.template.text,
            parameters: workOrder.template.parameters,
            config: workOrder.template.config
          },
          metadata: workOrder.metadata,
          lineage: workOrder.lineage
        };
        
        const content = yaml.dump(workOrderObj, { indent: 2, lineWidth: -1 });
        setYamlContent(content);
        setError(null);
      }
    } catch (err) {
      setError(`Error converting WorkOrder to YAML: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error converting WorkOrder to YAML:', err);
    }
  }, [workOrder]);
  
  // Handle YAML content changes
  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      setYamlContent(value);
      setError(null);
    }
  };
  
  // Apply YAML changes to the WorkOrder
  const handleApplyChanges = () => {
    try {
      const parsed = yaml.load(yamlContent) as any;
      
      // Validate that we have a proper structure
      if (!parsed.id || !parsed.template || !parsed.metadata) {
        throw new Error('Invalid WorkOrder structure. Must include id, template, and metadata.');
      }
      
      // Create a new WorkOrder with the parsed data
      const updatedWorkOrder: WorkOrder = {
        id: parsed.id,
        template: {
          text: parsed.template.text || '',
          parameters: parsed.template.parameters || [],
          config: parsed.template.config || {}
        },
        metadata: parsed.metadata,
        parent_id: parsed.parent_id,
        lineage: parsed.lineage || []
      };
      
      onChange(updatedWorkOrder);
      setError(null);
    } catch (err) {
      setError(`Error parsing YAML: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error parsing YAML:', err);
    }
  };
  
  return (
    <Box sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ flexGrow: 1, border: 1, borderColor: 'grey.300', borderRadius: 1, mb: 2 }}>
        <Editor
          height="100%"
          defaultLanguage="yaml"
          value={yamlContent}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            folding: true,
            wordWrap: 'on'
          }}
        />
      </Box>
      
      <Button 
        variant="contained" 
        onClick={handleApplyChanges}
        disabled={!yamlContent}
      >
        Apply Changes
      </Button>
    </Box>
  );
};

export default YAMLEditor;