// File: frontend/src/components/WorkOrderEditor/WorkOrderMetadataPanel.tsx
import React from 'react';
import { Box, Typography, TextField, Chip } from '@mui/material';
import { WorkOrderMetadata } from '../../types/workorder';

interface WorkOrderMetadataPanelProps {
  metadata: WorkOrderMetadata;
  onChange: (metadata: WorkOrderMetadata) => void; // Match this in WorkOrderEditor.tsx
  disabled?: boolean;
}

export const WorkOrderMetadataPanel: React.FC<WorkOrderMetadataPanelProps> = ({ 
  metadata, 
  onChange, 
  disabled = false 
}) => {
  const handleChange = (field: keyof WorkOrderMetadata, value: any) => {
    onChange({
      ...metadata,
      [field]: value
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Metadata</Typography>
      
      <TextField
        fullWidth
        label="Author"
        value={metadata.author || ''}
        onChange={(e) => handleChange('author', e.target.value)}
        margin="normal"
        size="small"
        disabled={disabled}
      />
      
      <TextField
        fullWidth
        label="Description"
        value={metadata.description || ''}
        onChange={(e) => handleChange('description', e.target.value)}
        margin="normal"
        size="small"
        multiline
        rows={2}
        disabled={disabled}
      />
      
      <TextField
        fullWidth
        label="Version"
        value={metadata.version || '1.0.0'}
        onChange={(e) => handleChange('version', e.target.value)}
        margin="normal"
        size="small"
        disabled={disabled}
      />
      
      <Box mt={2}>
        <Typography variant="subtitle2" gutterBottom>Tags</Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {metadata.tags && metadata.tags.map((tag, index) => (
            <Chip 
              key={index} 
              label={tag} 
              onDelete={disabled ? undefined : () => {
                const newTags = [...metadata.tags];
                newTags.splice(index, 1);
                handleChange('tags', newTags);
              }} 
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};