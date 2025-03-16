// File: frontend/src/components/WorkOrderEditor/ConfigurationEditor.tsx
/**
 * ConfigurationEditor component for editing different sections of work order configuration
 * Provides a unified YAML editing experience with consistent behavior
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Alert, Typography, Paper } from '@mui/material';
import { WorkOrder } from '../../types/workorder';
import Editor from '@monaco-editor/react';
import { load as yamlLoad } from 'js-yaml'; 

// Define configuration section types for type safety
export enum ConfigSection {
  INTENT = 'intent',
  SYSTEM = 'system'
}

// Interface for editor props following TypeScript Design Principles
export interface ConfigurationEditorProps {
  workOrder: WorkOrder;
  section: ConfigSection;
  initialYaml: string;
  onChange: (yaml: string) => void;
  onApplyChanges: (parsedData: any) => void;
  onSave: () => void;
  schemaExample?: any;
  title: string;
  description?: string;
}

export const ConfigurationEditor: React.FC<ConfigurationEditorProps> = ({
  workOrder,
  section,
  initialYaml = '',
  onChange,
  onApplyChanges,
  onSave,
  schemaExample,
  title,
  description
}) => {
  // State management
  const [yamlContent, setYamlContent] = useState<string>(initialYaml);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const editorRef = useRef<any>(null);
  const isInitialRender = useRef<boolean>(true);
  const lastSavedContent = useRef<string>(initialYaml);
  
  // Function to handle editor mount
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };
  
  // Initialize YAML content when the initialYaml changes from parent
  useEffect(() => {
    if (initialYaml) {
      if (isInitialRender.current || yamlContent !== lastSavedContent.current) {
        console.log(`Initializing ${section} editor with new YAML content`);
        setYamlContent(initialYaml);
        // Only update lastSavedContent if this is initial render or explicit update from parent
        if (isInitialRender.current) {
          lastSavedContent.current = initialYaml;
        }
        isInitialRender.current = false;
      }
    }
  }, [initialYaml, section, yamlContent]);
  
  // Handle YAML content changes in the editor
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setYamlContent(value);
      setError(null);
      onChange(value);
    }
  };
  
  // Handle saving the YAML changes to the WorkOrder
  const handleSave = () => {
    if (!yamlContent) {
      setError("No content to save");
      return;
    }
    
    try {
      // Parse the YAML
      const parsed = yamlLoad(yamlContent) as any;
      
      // Validate that we have proper structure
      if (!parsed) {
        throw new Error('Empty or invalid YAML configuration.');
      }
      
      console.log(`Saving ${section} YAML changes:`, parsed);
      
      // Update our reference to the last saved content
      lastSavedContent.current = yamlContent;
      
      // Apply the changes to the parent component
      onApplyChanges(parsed);
      setError(null);
      
      // Save to backend via parent save function
      onSave();
    } catch (err) {
      setError(`Error parsing YAML: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`Error parsing ${section} YAML:`, err);
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Paper sx={{ p: 3 }}>
        {description && (
          <Typography variant="body2" color="textSecondary" paragraph>
            {description}
          </Typography>
        )}
        
        <Box sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
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
            <Typography variant="caption" color="textSecondary">
              Edit the YAML configuration above, then click Save to update the work order.
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleSave}
              disabled={!yamlContent || yamlContent === lastSavedContent.current}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ConfigurationEditor;