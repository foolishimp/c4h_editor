// File: frontend/src/components/WorkOrderEditor/YAMLEditor.tsx
/**
 * YAMLEditor component for editing YAML configuration
 * Provides a Monaco editor with YAML syntax highlighting and validation
 */

import React, { useState, useEffect, useRef } from 'react';
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
  const lastSavedContent = useRef<string>(initialYaml);
  const editorRef = useRef<any>(null);
  
  // Function to handle editor mount
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };
  
  // Initialize YAML content when the initialYaml changes from parent
  useEffect(() => {
    if (initialYaml && initialYaml !== yamlContent && initialYaml !== lastSavedContent.current) {
      console.log('Initializing editor with new YAML content');
      setYamlContent(initialYaml);
      lastSavedContent.current = initialYaml;
      setError(null);
    }
  }, [initialYaml]);
  
  // Handle YAML content changes in the editor
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setYamlContent(value);
      setError(null);
      onChange(value);
    }
  };
  
  // Handle saving the YAML changes to the WorkOrder
  const handleSaveChanges = () => {
    if (!yamlContent) {
      setError("No content to save");
      return;
    }
    
    try {
      // Parse the YAML
      const parsed = yamlLoad(yamlContent) as any;
      
      // Validate that we have proper structure based on schema
      if (!parsed) {
        throw new Error('Empty or invalid YAML configuration.');
      }
      
      // Clean up any date fields to prevent validation errors
      if (parsed.due_date === '') {
        parsed.due_date = null;
      }
      
      // Update the last saved content reference
      lastSavedContent.current = yamlContent;
      
      // Apply the changes to the parent component
      onApplyChanges(parsed);
      setError(null);
    } catch (err) {
      setError(`Error parsing YAML: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error parsing YAML:', err);
    }
  };

  // Get the current editor content - useful for parent component to access
  const getCurrentContent = (): string => {
    return yamlContent;
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
          onMount={handleEditorDidMount}
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
          Edit the YAML configuration above, then click Save Changes to update the work order.
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleSaveChanges}
          disabled={!yamlContent || yamlContent === lastSavedContent.current}
        >
          Save Changes
        </Button>
      </Box>
    </Box>
  );
};

export default YAMLEditor;