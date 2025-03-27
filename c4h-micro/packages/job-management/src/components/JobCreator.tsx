import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress,
  Alert
} from '@mui/material';
import { configTypes, apiService } from 'shared';
import { useJobContext } from '../contexts/JobContext';

interface ConfigOption {
  id: string;
  description: string;
}

// Filter to only include config types required for jobs
const requiredConfigTypes = Object.entries(configTypes)
  .filter(([_, config]) => config.requiredForJob !== false)
  .map(([type]) => type);

const JobCreator: React.FC = () => {
  const { submitJob, loading, error } = useJobContext();
  
  // State for selected config IDs
  const [selectedConfigs, setSelectedConfigs] = useState<Record<string, string>>({});
  
  // State for available configs by type
  const [configOptions, setConfigOptions] = useState<Record<string, ConfigOption[]>>({});
  
  // State for form validity
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  
  // Load available configs for each type
  useEffect(() => {
    const loadConfigOptions = async () => {
      const options: Record<string, ConfigOption[]> = {};
      
      // Initialize all options with empty arrays
      requiredConfigTypes.forEach(type => {
        options[type] = [];
      });
      
      for (const configType of requiredConfigTypes) {
        try {
          // Use apiService's getConfigs method which handles endpoints correctly
          const configs = await apiService.getConfigs(configType);
          
          if (Array.isArray(configs)) {
            options[configType] = configs.map(item => {
              // Handle different response structures safely
              const description = item.description || 
                (item.metadata && item.metadata.description) || 
                'No description';
              return { id: item.id, description };
            });
          }
        } catch (err) {
          console.error(`Error loading ${configType} options:`, err);
          // Already initialized to empty array above
        }
      }
      
      setConfigOptions(options);
    };
    
    loadConfigOptions();
  }, []);
  
  // Validate form
  useEffect(() => {
    // Check if all required config types have a selection
    const requiredTypes = requiredConfigTypes;
    const isValid = requiredTypes.every(type => selectedConfigs[type]);
    
    setIsFormValid(isValid);
  }, [selectedConfigs]);
  
  // Handle config selection
  const handleConfigSelect = (configType: string, configId: string) => {
    setSelectedConfigs(prev => ({
      ...prev,
      [configType]: configId
    }));
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (isFormValid) {
      submitJob(selectedConfigs);
    }
  };
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Create New Job
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box>
          {requiredConfigTypes.map(configType => (
            <FormControl 
              key={configType} 
              fullWidth 
              sx={{ mb: 2 }}
              disabled={loading}
            >
              <InputLabel id={`${configType}-label`}>
                {configTypes[configType].name}
              </InputLabel>
              <Select
                labelId={`${configType}-label`}
                value={selectedConfigs[configType] || ''}
                label={configTypes[configType].name}
                onChange={(e) => handleConfigSelect(configType, e.target.value as string)}
              >
                <MenuItem value="">
                  <em>Select a {configTypes[configType].name.toLowerCase()}</em>
                </MenuItem>
                {configOptions[configType]?.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.id} - {option.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit Job'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default JobCreator;