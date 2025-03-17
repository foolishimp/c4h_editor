/**
 * File: frontend/src/components/WorkOrderEditor/ConfigurationEditor.tsx
 * 
 * ConfigurationEditor component for editing YAML configuration
 * Simplified to work directly with the WorkOrderContext
 */

import React, { useState, useRef } from 'react';
import { Box, Button, Alert, Typography, Paper } from '@mui/material';
import Editor from '@monaco-editor/react';
import { ConfigSection } from '../../contexts/WorkOrderContext';

// Interface for editor props
export interface ConfigurationEditorProps {
  section: ConfigSection;
  yaml: string;
  onChange: (yaml: string) => void;
  onSave: () => void;
  title: string;
  description?: string;
  schemaExample?: any;
}

export const ConfigurationEditor: React.FC<ConfigurationEditorProps> = ({
  section,
  yaml,
  onChange,
  onSave,
  title,
  description,
}) => {
  // Local state just for UI
  const [error, setError] = useState<string | null>(null);
  
  // Editor reference
  const editorRef = useRef<any>(null);
  
  // Function to handle editor mount
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };
  
  // Handle YAML content changes in the editor
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setError(null);
      onChange(value);
    }
  };
  
  // Handle saving
  const handleSave = () => {
    if (!yaml) {
      setError("No content to save");
      return;
    }
    
    try {
      onSave();
      setError(null);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`Error saving ${section} configuration:`, err);
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
              value={yaml}
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
              disabled={!yaml}
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