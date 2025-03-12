import { useState, useEffect } from 'react';
import { TextField, Typography, Box, FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput } from '@mui/material';
import { WorkOrderMetadata } from '../../types/workorder';

interface WorkOrderMetadataPanelProps {
  metadata: WorkOrderMetadata;
  onChange: (metadata: WorkOrderMetadata) => void;
  readOnly?: boolean;
}

export const WorkOrderMetadataPanel = ({ metadata, onChange, readOnly = false }: WorkOrderMetadataPanelProps) => {
  const [localMetadata, setLocalMetadata] = useState<WorkOrderMetadata>(metadata);

  useEffect(() => {
    setLocalMetadata(metadata);
  }, [metadata]);

  const handleChange = (field: keyof WorkOrderMetadata, value: any) => {
    if (readOnly) return;
    
    const updatedMetadata = {
      ...localMetadata,
      [field]: value
    };
    setLocalMetadata(updatedMetadata);
    onChange(updatedMetadata);
  };

  return (
    <Box className="metadata-panel">
      <Typography variant="h6" gutterBottom>
        Work Order Metadata
      </Typography>
      
      <TextField
        label="Title"
        value={localMetadata.title || ''}
        onChange={(e) => handleChange('title', e.target.value)}
        fullWidth
        margin="normal"
        disabled={readOnly}
      />
      
      <TextField
        label="Description"
        value={localMetadata.description || ''}
        onChange={(e) => handleChange('description', e.target.value)}
        fullWidth
        margin="normal"
        multiline
        rows={3}
        disabled={readOnly}
      />
      
      <TextField
        label="Author"
        value={localMetadata.author || ''}
        onChange={(e) => handleChange('author', e.target.value)}
        fullWidth
        margin="normal"
        disabled={readOnly}
      />
      
      <FormControl fullWidth margin="normal" disabled={readOnly}>
        <InputLabel id="tags-label">Tags</InputLabel>
        <Select
          labelId="tags-label"
          multiple
          value={localMetadata.tags || []}
          onChange={(e) => handleChange('tags', e.target.value)}
          input={<OutlinedInput id="select-multiple-chip" label="Tags" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as string[]).map((value) => (
                <Chip key={value} label={value} />
              ))}
            </Box>
          )}
        >
          {['important', 'urgent', 'maintenance', 'feature', 'bug', 'documentation'].map((tag) => (
            <MenuItem key={tag} value={tag}>
              {tag}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <TextField
        label="Target Model"
        value={localMetadata.target_model || ''}
        onChange={(e) => handleChange('target_model', e.target.value)}
        fullWidth
        margin="normal"
        disabled={readOnly}
      />
      
      <TextField
        label="Version"
        value={localMetadata.version || ''}
        onChange={(e) => handleChange('version', e.target.value)}
        fullWidth
        margin="normal"
        disabled={readOnly}
      />
      
      <TextField
        label="Asset"
        value={localMetadata.asset || ''}
        onChange={(e) => handleChange('asset', e.target.value)}
        fullWidth
        margin="normal"
        disabled={readOnly}
      />
      
      <TextField
        label="Intent"
        value={localMetadata.intent || ''}
        onChange={(e) => handleChange('intent', e.target.value)}
        fullWidth
        margin="normal"
        disabled={readOnly}
      />
      
      <TextField
        label="Goal"
        value={localMetadata.goal || ''}
        onChange={(e) => handleChange('goal', e.target.value)}
        fullWidth
        margin="normal"
        disabled={readOnly}
      />
      
      <TextField
        label="Priority"
        value={localMetadata.priority || ''}
        onChange={(e) => handleChange('priority', e.target.value)}
        fullWidth
        margin="normal"
        disabled={readOnly}
        select
      >
        <MenuItem value="low">Low</MenuItem>
        <MenuItem value="medium">Medium</MenuItem>
        <MenuItem value="high">High</MenuItem>
        <MenuItem value="critical">Critical</MenuItem>
      </TextField>
      
      <TextField
        label="Due Date"
        type="date"
        value={localMetadata.due_date ? new Date(localMetadata.due_date).toISOString().split('T')[0] : ''}
        onChange={(e) => handleChange('due_date', e.target.value)}
        fullWidth
        margin="normal"
        InputLabelProps={{
          shrink: true
        }}
        disabled={readOnly}
      />
      
      <TextField
        label="Assignee"
        value={localMetadata.assignee || ''}
        onChange={(e) => handleChange('assignee', e.target.value)}
        fullWidth
        margin="normal"
        disabled={readOnly}
      />
      
      <Typography variant="caption" display="block" gutterBottom>
        Created: {localMetadata.created_at ? new Date(localMetadata.created_at).toLocaleString() : 'N/A'}
      </Typography>
      
      <Typography variant="caption" display="block" gutterBottom>
        Last Updated: {localMetadata.updated_at ? new Date(localMetadata.updated_at).toLocaleString() : 'N/A'}
      </Typography>
    </Box>
  );
};