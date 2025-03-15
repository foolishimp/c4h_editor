// File: frontend/src/components/WorkOrderEditor/YAMLEditor.tsx
import React, { useState, useEffect } from 'react';
import { Box, Button, Alert, Typography, Paper } from '@mui/material';
import { WorkOrder } from '../../types/workorder';
import Editor from '@monaco-editor/react';
import * as yaml from 'js-yaml';

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
  title = 'YAML Editor'
}) => {
  const [yamlContent, setYamlContent] = useState<string>(initialYaml);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize YAML content when the initialYaml changes
  useEffect(() => {
    if (initialYaml) {
      setYamlContent(initialYaml);
      setError(null);
    }
  }, [initialYaml]);
  
  // Handle YAML content changes
  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      setYamlContent(value);
      setError(null);
      onChange(value);
    }
  };
  
  // Apply YAML changes to the WorkOrder
  const handleApplyChanges = () => {
    try {
      const parsed = yaml.load(yamlContent) as any;
      
      // Validate that we have proper structure based on schema
      if (!parsed) {
        throw new Error('Empty or invalid YAML configuration.');
      }
      
      onApplyChanges(parsed);
      setError(null);
    } catch (err) {
      setError(`Error parsing YAML: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error parsing YAML:', err);
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