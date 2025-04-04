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
import { configTypes, apiService } from 'shared';
import { useJobContext } from '../contexts/JobContext';

interface ConfigOption {
  id: string;
  description: string;
}

// Filter to only include config types required for jobs
// We specifically need workorder, teamconfig, and runtimeconfig
const REQUIRED_CONFIG_TYPES = ['workorder', 'teamconfig', 'runtimeconfig'];

const JobCreator: React.FC = () => {
  const { submitJobTuple, loading, error } = useJobContext();
  
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
          // Use apiService's getConfigs method which handles endpoints correctly
          const configs = await apiService.getConfigs(configType);
          if (Array.isArray(configs)) {
            options[configType] = configs.map(item => {
              // Handle different response structures safely - checking all possible locations for descriptions
              const description = (item.metadata?.description?.trim() || item.title?.trim() || 
                                 item.description?.trim() || '').trim() || 'No description';
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
    // Form is valid when all three required config types are selected
    const isValid = Boolean(workorderId) && Boolean(teamconfigId) && Boolean(runtimeconfigId);
    
    setIsFormValid(isValid);
  }, [workorderId, teamconfigId, runtimeconfigId]);
  
  // Handle form submission
  const handleSubmit = () => {
    if (isFormValid) {
      submitJobTuple({
        workorder: workorderId,
        teamconfig: teamconfigId,
        runtimeconfig: runtimeconfigId
      });
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