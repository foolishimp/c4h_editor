import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
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
import { configTypes, api, JobConfigReference, eventBus, EventDetail, checkApiServiceReady } from 'shared'; // Import checkApiServiceReady
import { useJobContext } from '../contexts/JobContext';

interface ConfigOption {
  id: string;
  description: string;
  updated_at?: string;
}

// Filter to only include config types required for jobs
const REQUIRED_CONFIG_TYPES = ['workorder', 'teamconfig', 'runtimeconfig'];

const JobCreator: React.FC = () => {
  const { submitJobConfigurations, loading, error: submissionError } = useJobContext(); // Rename context error
  const [workorderId, setWorkorderId] = useState<string>("");
  const [teamconfigId, setTeamconfigId] = useState<string>("");
  const [runtimeconfigId, setRuntimeconfigId] = useState<string>("");
  const [configOptions, setConfigOptions] = useState<Record<string, ConfigOption[]>>({});
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false); // State for loading options
  const [optionsError, setOptionsError] = useState<string | null>(null); // State for options loading error

  // --- Refactored function to load config options ---
  const loadConfigOptions = useCallback(async () => {
    console.log("JobCreator: Loading config options...");
    setLoadingOptions(true);
    setOptionsError(null);

    // --- ADD Readiness Check ---
    if (!checkApiServiceReady()) {
        console.log("JobCreator: Waiting for API service to be ready before loading config options...");
        setOptionsError("API service not ready. Please wait or refresh.");
        setLoadingOptions(false);
        return; // Don't proceed if not ready
    }
    // --- END Readiness Check ---

    const options: Record<string, ConfigOption[]> = {};
    REQUIRED_CONFIG_TYPES.forEach(type => { options[type] = []; });

    let fetchErrorOccurred = false;

    for (const configType of REQUIRED_CONFIG_TYPES) {
      try {
        const endpoint = configTypes[configType]?.apiEndpoints.list;
        if (endpoint) {
          const response = await api.get(endpoint); // [cite: 963]
          const configs = Array.isArray(response.data) ? response.data : [];

          if (Array.isArray(configs)) {
            let mappedOptions: ConfigOption[] = configs.map(item => {
              const description = (item.metadata?.description?.trim() || item.title?.trim() || item.description?.trim() || '').trim() || 'No description';
              return {
                id: item.id,
                description: description,
                updated_at: item.updated_at // Expecting backend to provide this [cite: 1950]
              };
            }).filter(item => item.id); // Ensure ID exists

            // Sort by updated_at descending (newest first)
            mappedOptions.sort((a, b) => {
              const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
              const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
              return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA); // Descending sort [cite: 1205, 1206]
            });

            options[configType] = mappedOptions;
          } else {
             console.warn(`JobCreator: Unexpected response format for ${configType}`, response.data);
          }
        }
      } catch (err: any) {
        console.error(`JobCreator: Error loading ${configType} options:`, err);
        fetchErrorOccurred = true;
        // Set error for specific type or a general one
        setOptionsError(`Failed to load options for ${configType}. Please refresh or check the console.`);
      }
    }

    if (!fetchErrorOccurred) {
       setOptionsError(null); // Clear error if all fetches succeed
    }
    setConfigOptions(options);
    setLoadingOptions(false);
    console.log("JobCreator: Config options loaded.", options);
  }, []); // Empty dependency array means this function definition doesn't change

  // --- Load options on initial mount ---
  useEffect(() => {
    loadConfigOptions();
  }, [loadConfigOptions]); // Depend on the memoized load function

  // --- Subscribe to eventBus for updates ---
  useEffect(() => {
      const handleConfigUpdate = (detail: EventDetail) => {
        // Check if the updated type is one we care about
        if (REQUIRED_CONFIG_TYPES.includes(detail?.payload?.configType)) {
            console.log(`JobCreator: Received configListUpdated event for ${detail.payload.configType}. Refreshing options.`);
            loadConfigOptions();
        }
    };
    eventBus.subscribe('configListUpdated', handleConfigUpdate);

    console.log("JobCreator: Subscribing to configListUpdated event.");
    const unsubscribe = eventBus.subscribe('configListUpdated', handleConfigUpdate); // [cite: 985]

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      console.log("JobCreator: Unsubscribing from configListUpdated event.");
      unsubscribe(); // [cite: 987]
    };
  }, [loadConfigOptions]); // Depend on loadConfigOptions

  // Validate form
  useEffect(() => {
    const isValid = Boolean(workorderId) && Boolean(teamconfigId) && Boolean(runtimeconfigId);
    setIsFormValid(isValid);
  }, [workorderId, teamconfigId, runtimeconfigId]);

  // Handle form submission
  const handleSubmit = () => {
    if (isFormValid) {
      try {
        const configList: JobConfigReference[] = [
          { id: runtimeconfigId, config_type: 'runtimeconfig' }, // [cite: 1211]
          { id: teamconfigId, config_type: 'teamconfig' },       // [cite: 1211]
          { id: workorderId, config_type: 'workorder' }         // [cite: 1212]
        ];
        submitJobConfigurations(configList); // [cite: 1213]
      } catch (err) { /* Error is handled by the context */ }
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Create New Job
        </Typography>

        {/* Display options loading/error state */}
        {loadingOptions && (
           <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
               <CircularProgress size={20} sx={{ mr: 1 }} />
               <Typography>Loading configuration options...</Typography>
           </Box>
        )}
        {optionsError && !loadingOptions && (
           <Alert severity="warning" sx={{ mb: 2 }}>
             {optionsError}
             <Button size="small" onClick={loadConfigOptions} sx={{ ml: 1 }}>Retry</Button>
           </Alert>
        )}
        {submissionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submissionError}
          </Alert>
        )}

        <Box>
          {/* Workorder Selection */}
          <FormControl
            fullWidth
            sx={{ mb: 2 }}
            disabled={loading || loadingOptions} // Disable during submission or options loading
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
            disabled={loading || loadingOptions}
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
            disabled={loading || loadingOptions}
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
              disabled={!isFormValid || loading || loadingOptions} // Also disable if options are loading
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