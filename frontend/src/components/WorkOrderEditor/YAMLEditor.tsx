// File: frontend/src/components/WorkOrderEditor/YAMLEditor.tsx
/**
 * YAMLEditor component for editing YAML configuration
 * Provides a Monaco editor with YAML syntax highlighting and validation
 */

import React, { useState, useEffect } from 'react';
import { Box, Button, Alert, Typography } from '@mui/material';
import { WorkOrder } from '../../types/workorder';
import Editor from '@monaco-editor/react';
import { load as yamlLoad } from 'js-yaml'; // ES Module import for js-yaml

interface YAMLEditorProps {
  workOrder: WorkOrder;
  initialYaml?: string;
  onChange: (yamlContent: string) => void;
  onApplyChanges: (parsedData: any) => void;
  schemaExample?: any;
  title?: string;
}

export const YAMLEditor: React.FC<YAMLEditorProps> = ({ 
  workOrder, 
  initialYaml = '', 
  onChange, 
  onApplyChanges,
  schemaExample,
  title = 'YAML Editor'
}) => {
  const [yamlContent, setYamlContent] = useState<string>(initialYaml);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  
  // Initialize YAML content when the initialYaml changes
  useEffect(() => {
    if (initialYaml) {
      setYamlContent(initialYaml);
      setError(null);
      
      // Try to parse initially to ensure we have valid data
      try {
        const parsed = yamlLoad(initialYaml) as any;
        setParsedData(parsed);
      } catch (err) {
        // We won't set an error here since we just initialized
        console.warn("Initial YAML parse failed:", err);
      }
    }
  }, [initialYaml]);
  
  // Handle YAML content changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setYamlContent(value);
      setError(null);
      onChange(value);
      
      // Try to parse on each change to provide immediate feedback
      try {
        const parsed = yamlLoad(value) as any;
        setParsedData(parsed);
        // We won't set error here even if parse fails to avoid interrupting typing
      } catch (err) {
        // Don't show error during typing, but clear parsedData
        setParsedData(null);
      }
    }
  };
  
  // Apply YAML changes to the WorkOrder
  const handleApplyChanges = () => {
    try {
      // Only attempt to parse if we haven't already done so
      const parsed = parsedData || yamlLoad(yamlContent) as any;
      
      // Validate that we have proper structure based on schema
      if (!parsed) {
        throw new Error('Empty or invalid YAML configuration.');
      }
      
      // Clean up any date fields to prevent validation errors
      if (parsed.due_date === '') {
        parsed.due_date = null;
      }
      
      // Apply the changes to the parent component
      onApplyChanges(parsed);
      setError(null);
    } catch (err) {
      setError(`Error parsing YAML: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error parsing YAML:', err);
    }
  };

  // Auto-apply changes when leaving tab or saving
  const handleAutoApply = () => {
    try {
      if (parsedData) {
        // We already have valid parsed data
        onApplyChanges(parsedData);
        return true;
      } else {
        // Try to parse and apply
        const parsed = yamlLoad(yamlContent) as any;
        if (parsed) {
          onApplyChanges(parsed);
          return true;
        }
      }
      return false;
    } catch (err) {
      setError(`Error auto-applying YAML changes: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };
  
  return (
    <Box sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1">{title}</Typography>
      </Box>
      
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
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true
          }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Edit the YAML configuration above, then click Apply Changes to update the work order.
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleApplyChanges}
          disabled={!yamlContent}
        >
          Apply Changes
        </Button>
      </Box>
    </Box>
  );
};

export default YAMLEditor;