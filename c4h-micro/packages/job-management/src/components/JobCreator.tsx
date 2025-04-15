import React, { useState, useEffect } from 'react';
import { 
  Alert,
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  FormControl, 
  InputLabel,
  CircularProgress,
  Select, 
  MenuItem
} from '@mui/material'; 
import { configTypes, api, JobConfigReference } from 'shared';
import { useJobContext } from '../contexts/JobContext';

interface ConfigOption {
  id: string;
  description: string;
  updated_at?: string;
}

// Filter to only include config types required for jobs
const REQUIRED_CONFIG_TYPES = ['workorder', 'teamconfig', 'runtimeconfig'];

const JobCreator: React.FC = () => {
  const { submitJobConfigurations, loading, error } = useJobContext();
  
  // State for selected config IDs - with strict typing for required configs
  const [workorderId, setWorkorderId] = useState<string>(""); 
  const [teamconfigId, setTeamconfigId] = useState<string>("");
  const [runtimeconfigId, setRuntimeconfigId] = useState<string>("");
  
  // State for available configs by type
  const [configOptions, setConfigOptions] = useState<Record<string, ConfigOption[]>>({});
  
  // State for form validity
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  
  // Load available configs for each type 
  useEffect(() => {
    const loadConfigOptions = async () => {
      // Initialize options with empty arrays for all required config types
      const options: Record<string, ConfigOption[]> = {};
      
      // Initialize all options with empty arrays
      REQUIRED_CONFIG_TYPES.forEach(type => {
        options[type] = [];
      });
      
      for (const configType of REQUIRED_CONFIG_TYPES) {
        try {
          // Get the API endpoint for this config type
          const endpoint = configTypes[configType]?.apiEndpoints.list;
          if (endpoint) {
            // Make the API call
            const response = await api.get(endpoint);
            
            const configs = Array.isArray(response.data) ? response.data : [];

            if (Array.isArray(configs)) {
              // Map to ConfigOption format first
              let mappedOptions: ConfigOption[] = configs.map(item => {
                // Handle different response structures safely - checking all possible locations for descriptions
                const description = (item.metadata?.description?.trim() || item.title?.trim() || 
                                   item.description?.trim() || '').trim() || 'No description';
                // Include updated_at for sorting
                return { 
                  id: item.id, 
                  description: description,
                  updated_at: item.updated_at // Assuming API returns this field directly now
                };
              });

              // Sort by updated_at descending (newest first)
              mappedOptions.sort((a, b) => {
                const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA); // Descending sort
              });

              options[configType] = mappedOptions;
            }
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
    // Form is valid when all three required config types are selected
    const isValid = Boolean(workorderId) && Boolean(teamconfigId) && Boolean(runtimeconfigId); 
    
    setIsFormValid(isValid);
  }, [workorderId, teamconfigId, runtimeconfigId]);
  
  // Handle form submission
  const handleSubmit = () => {
    if (isFormValid) {
      try {
        // Create a list of configurations in the order they should be applied
        // Order matters - items later in the list have precedence in merges
        const configList: JobConfigReference[] = [
          // List from lowest to highest precedence
          {
            id: runtimeconfigId,
            config_type: 'runtimeconfig'
          },
          {
            id: teamconfigId,
            config_type: 'teamconfig'
          },
          {
            id: workorderId,
            config_type: 'workorder'
          }
        ];
        submitJobConfigurations(configList);
      } catch (err) { /* Error is handled by the context */ }
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
          {/* Workorder Selection */}
          <FormControl 
            fullWidth 
            sx={{ mb: 2 }}
            disabled={loading}
          >
            <InputLabel id="workorder-label"> 
              {configTypes['workorder'].name}
            </InputLabel>
            <Select
              labelId="workorder-label"
              value={workorderId}
              label={configTypes['workorder'].name}
              onChange={(e) => setWorkorderId(e.target.value as string)}
            >
              <MenuItem value="">
                <em>Select a {configTypes['workorder'].name.toLowerCase()}</em>
              </MenuItem>
              {configOptions['workorder']?.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.id} - {option.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Team Configuration Selection */}
          <FormControl 
            fullWidth 
            sx={{ mb: 2 }}
            disabled={loading}
          >
            <InputLabel id="teamconfig-label"> 
              {configTypes['teamconfig'].name}
            </InputLabel>
            <Select
              labelId="teamconfig-label"
              value={teamconfigId}
              label={configTypes['teamconfig'].name}
              onChange={(e) => setTeamconfigId(e.target.value as string)}
            >
              <MenuItem value="">
                <em>Select a {configTypes['teamconfig'].name.toLowerCase()}</em>
              </MenuItem>
              {configOptions['teamconfig']?.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.id} - {option.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Runtime Configuration Selection */}
          <FormControl 
            fullWidth 
            sx={{ mb: 2 }}
            disabled={loading}
          >
            <InputLabel id="runtimeconfig-label"> 
              {configTypes['runtimeconfig'].name}
            </InputLabel>
            <Select
              labelId="runtimeconfig-label"
              value={runtimeconfigId}
              label={configTypes['runtimeconfig'].name}
              onChange={(e) => setRuntimeconfigId(e.target.value as string)}
            >
              <MenuItem value="">
                <em>Select a {configTypes['runtimeconfig'].name.toLowerCase()}</em>
              </MenuItem>
              {configOptions['runtimeconfig']?.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.id} - {option.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
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