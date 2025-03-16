// File: frontend/src/components/WorkOrderEditor/ConfigurationPanel.tsx
/**
 * Configuration panel for displaying and editing work order configuration
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  Autocomplete
} from '@mui/material';

interface ConfigurationPanelProps {
  title: string;
  description: string;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  title,
  description,
  config,
  onChange
}) => {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config);

  // Update local config when parent config changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Handle changes to config fields
  const handleChange = (field: string, value: any) => {
    const updatedConfig = {
      ...localConfig,
      [field]: value
    };
    setLocalConfig(updatedConfig);
    onChange(updatedConfig);
  };

  // Render different form controls based on field type
  const renderFormControl = (field: string, value: any) => {
    // Determine type of field from value
    const type = Array.isArray(value) ? 'array' : typeof value;
    
    switch (type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={value}
                onChange={(e) => handleChange(field, e.target.checked)}
              />
            }
            label={formatFieldLabel(field)}
          />
        );
      
      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={formatFieldLabel(field)}
            value={value}
            onChange={(e) => handleChange(field, Number(e.target.value))}
            margin="normal"
          />
        );
      
      case 'array':
        return (
          <Autocomplete
            multiple
            options={[]}
            freeSolo
            value={value || []}
            onChange={(_, newValue) => handleChange(field, newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={formatFieldLabel(field)}
                margin="normal"
              />
            )}
          />
        );
      
      default: // string or any other type
        return (
          <TextField
            fullWidth
            label={formatFieldLabel(field)}
            value={value || ''}
            onChange={(e) => handleChange(field, e.target.value)}
            margin="normal"
          />
        );
    }
  };

  // Format field name for display (convert snake_case to Title Case)
  const formatFieldLabel = (field: string): string => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography variant="body2" color="textSecondary" paragraph>{description}</Typography>
        
        <Grid container spacing={2}>
          {Object.entries(localConfig).map(([field, value]) => (
            <Grid item xs={12} sm={6} key={field}>
              {renderFormControl(field, value)}
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ConfigurationPanel;