// File: frontend/src/components/WorkOrderEditor/WorkOrderMetadataPanel.tsx
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Chip, 
  Stack,
  InputAdornment,
  IconButton 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { WorkOrderMetadata } from '../../types/workorder';

interface WorkOrderMetadataPanelProps {
  metadata: WorkOrderMetadata;
  onChange: (metadata: WorkOrderMetadata) => void;
  disabled?: boolean;
}

export const WorkOrderMetadataPanel: React.FC<WorkOrderMetadataPanelProps> = ({ 
  metadata, 
  onChange, 
  disabled = false 
}) => {
  const [newTag, setNewTag] = useState<string>('');

  const handleChange = (field: keyof WorkOrderMetadata, value: any) => {
    onChange({
      ...metadata,
      [field]: value
    });
  };

  const handleAddTag = () => {
    if (!newTag.trim() || disabled) return;
    
    // Check if tag already exists
    if (metadata.tags.includes(newTag.trim())) {
      setNewTag('');
      return;
    }
    
    // Add the new tag
    const newTags = [...metadata.tags, newTag.trim()];
    handleChange('tags', newTags);
    setNewTag('');
  };

  const handleDeleteTag = (tagToDelete: string) => {
    if (disabled) return;
    
    const newTags = metadata.tags.filter(tag => tag !== tagToDelete);
    handleChange('tags', newTags);
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Metadata</Typography>
      
      <Stack spacing={2}>
        <TextField
          fullWidth
          label="Author"
          value={metadata.author || ''}
          onChange={(e) => handleChange('author', e.target.value)}
          disabled={disabled}
        />
        
        <TextField
          fullWidth
          label="Description"
          value={metadata.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          multiline
          rows={3}
          disabled={disabled}
        />
        
        <TextField
          fullWidth
          label="Goal"
          value={metadata.goal || ''}
          onChange={(e) => handleChange('goal', e.target.value)}
          multiline
          rows={2}
          disabled={disabled}
        />
        
        <TextField
          fullWidth
          label="Priority"
          value={metadata.priority || ''}
          onChange={(e) => handleChange('priority', e.target.value)}
          disabled={disabled}
        />
        
        <TextField
          fullWidth
          label="Due Date"
          type="date"
          value={metadata.due_date || ''}
          onChange={(e) => handleChange('due_date', e.target.value)}
          InputLabelProps={{ shrink: true }}
          disabled={disabled}
        />
        
        <TextField
          fullWidth
          label="Assignee"
          value={metadata.assignee || ''}
          onChange={(e) => handleChange('assignee', e.target.value)}
          disabled={disabled}
        />
        
        <TextField
          fullWidth
          label="Asset"
          value={metadata.asset || ''}
          onChange={(e) => handleChange('asset', e.target.value)}
          disabled={disabled}
        />
        
        <TextField
          fullWidth
          label="Target Model"
          value={metadata.target_model || ''}
          onChange={(e) => handleChange('target_model', e.target.value)}
          disabled={disabled}
        />
        
        <TextField
          fullWidth
          label="Version"
          value={metadata.version || '1.0.0'}
          onChange={(e) => handleChange('version', e.target.value)}
          disabled={disabled || true} // Version is typically read-only
        />
        
        <Box>
          <Typography variant="subtitle2" gutterBottom>Tags</Typography>
          
          <TextField
            fullWidth
            label="Add Tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleTagKeyPress}
            disabled={disabled}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={handleAddTag}
                    disabled={!newTag.trim() || disabled}
                  >
                    <AddIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {metadata.tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                onDelete={disabled ? undefined : () => handleDeleteTag(tag)}
                color="primary"
                variant="outlined"
              />
            ))}
            {metadata.tags.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No tags added yet
              </Typography>
            )}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

export default WorkOrderMetadataPanel;