// File: packages/config-editor/src/components/YAMLEditor.tsx
import React, { useRef } from 'react';
import { Box, Button, Paper, Typography, Alert } from '@mui/material';
import Editor from '@monaco-editor/react';

interface YamlEditorProps {
  yaml: string;
  onChange: (yaml: string) => void;
  onSave: () => Promise<void>;
  readOnly?: boolean;
}

export const YamlEditor: React.FC<YamlEditorProps> = ({ 
  yaml, 
  onChange,
  onSave,
  readOnly = false
}) => {
  // Editor reference
  const editorRef = useRef<any>(null);
  
  // Function to handle editor mount
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };
  
  // Handle YAML content changes in the editor
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };
  
  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          WorkOrder Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Edit the complete WorkOrder configuration in YAML format. Changes will only be applied when you save.
        </Typography>
      </Box>
      
      <Box 
        sx={{ 
          height: '500px', 
          border: 1, 
          borderColor: 'grey.300', 
          borderRadius: 1, 
          mb: 2,
          overflow: 'hidden' 
        }}
      >
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
            automaticLayout: true,
            readOnly: readOnly
          }}
        />
      </Box>
      
      {!readOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Alert severity="info" sx={{ mr: 2, flexGrow: 1 }}>
            This editor modifies the entire WorkOrder configuration directly in YAML. 
            Make sure your YAML is valid before saving.
          </Alert>
          <Button 
            variant="contained" 
            onClick={onSave}
            disabled={!yaml}
          >
            Save Changes
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default YamlEditor;