// File: /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/config-selector/src/contexts/ConfigContext.tsx
// ** IMPORTS **
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import { configTypes, apiService, Config, eventBus, EventTypes, checkApiServiceReady } from 'shared'; // Correctly import checkApiServiceReady
// REMOVE invalid cross-package import: import { useShellConfig } from '../../../../shell/src/contexts/ShellConfigContext';
// Import eventBus and EventTypes

// ** INTERFACE & DEFAULT STATE ** (From Original)
interface ConfigContextState {
  configType: string;
  configs: any[]; // Consider using a more specific type if possible
  currentConfig: Config | null; // Use the imported Config type
  yaml: string;
  loading: boolean;
  error: string | null;
  saved: boolean; // Tracks if the current state matches the last saved/loaded state
  loadConfigs: () => Promise<void>;
  loadConfig: (id: string) => Promise<void>;
  // Allow createNewConfig to accept initial data (like description)
  createNewConfig: (initialData?: Partial<Config>) => Config; // Return the created config object
  updateYaml: (yaml: string) => void;
  // Update saveConfig signature to accept metadata overrides
  saveConfig: (idToSave?: string, commitMessage?: string, metadataOverrides?: Partial<Config['metadata']>) => Promise<Config | null>; // Return saved config or null
  deleteConfig: (id: string, commitMessage?: string) => Promise<void>;
  archiveConfig: (id: string, archive: boolean, author?: string) => Promise<void>;
  cloneConfig: (id: string, newId: string, author?: string) => Promise<void>; // Added author optional param
}

// Default state with stubs (From Original)
const defaultContextState: ConfigContextState = {
  configType: '',
  configs: [],
  currentConfig: null,
  yaml: '',
  loading: false,
  error: null,
  saved: false, // Initial state is not 'saved'
  loadConfigs: async () => {},
  loadConfig: async () => {},
  createNewConfig: () => ({} as Config),
  updateYaml: () => {},
  saveConfig: async () => null,
  deleteConfig: async () => {},
  archiveConfig: async () => {},
  cloneConfig: async () => {}
};

// Create the context using createContext
const ConfigContext = createContext<ConfigContextState>(defaultContextState);

// ** PROVIDER COMPONENT **
interface ConfigProviderProps {
  children: ReactNode;
  configType: string;
  initialConfigId?: string | null; // Add optional prop for initial ID
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children, configType, initialConfigId }) => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [currentConfig, setCurrentConfig] = useState<Config | null>(null); // Use Config type
  const [yaml, setYaml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  // Readiness will be checked via checkApiServiceReady() before API calls

  // Emit config-related events to the event bus for cross-MFE communication
  const emitConfigChange = useCallback((action: 'loaded' | 'saved' | 'deleted', config: Config | null) => {
    eventBus.publish('config:change', { // Assuming 'config:change' is a defined event type
      source: 'config-selector',
      payload: { action, configType, config }
    });
  }, [configType]);

  // --- ensureMetadata (Original Implementation) ---
  const ensureMetadata = useCallback((config: any) => {
    if (!config) return;
    if (!config.metadata) {
      // Initialize with defaults if metadata is completely missing
      config.metadata = {
        author: 'Current User',
        description: '',
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0.0',
        archived: false // Default archived to false
      };
    } else {
      // Ensure individual fields exist and have defaults if missing
      if (config.metadata.description === undefined || config.metadata.description === null) {
        config.metadata.description = '';
      }
      if (!config.metadata.author) config.metadata.author = 'Current User';
      if (!config.metadata.tags) config.metadata.tags = [];
      if (!config.metadata.created_at) config.metadata.created_at = new Date().toISOString();
      if (!config.metadata.updated_at) config.metadata.updated_at = new Date().toISOString();
      if (!config.metadata.version) config.metadata.version = '1.0.0';
      if (config.metadata.archived === undefined) config.metadata.archived = false; // Default archived if missing
    }
  }, []); // [cite: 1382]

  // --- loadConfigs (Original Implementation) ---
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log(`ConfigContext: Proceeding to load configs for ${configType} (assuming bootstrap complete).`);
    try {
      const response = await apiService.getConfigs(configType);
      setConfigs(response || []);
      // Optionally emit an event that the list was updated
      eventBus.publish('configListUpdated', { source: 'config-selector', payload: { configType } }); // Emit list update event
    } catch (err: any) {
      // --- FIX: Safer Error Message Handling ---
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to load configurations';
      setError(errorMsg);
      console.error(`ConfigContext: Error loading configs for type '${configType}'. API Response:`, err?.response?.data);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [configType]); // No longer depends on isShellReady state/prop
  // Added isShellReady dependency

  // Function to create a new blank config state
  const createNewConfig = useCallback((initialData?: Partial<Config>): Config => {
    const defaultContent = configTypes[configType]?.defaultContent || {};
    // Ensure the structure matches the Config interface
    const emptyConfig: Config = {
      id: '', // ID will be set on save
      config_type: configType,
      content: defaultContent,
      metadata: { // Initialize metadata structure
          author: 'Current User',
          archived: false,
          // Use initialData if provided, otherwise default
          description: initialData?.metadata?.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: [],
          version: '1.0.0'
      },
      parent_id: undefined, // Use undefined instead of null if appropriate
      lineage: []
    };
    // No need to call ensureMetadata here as we initialize it fully
    // Merge any other initial data provided
    Object.assign(emptyConfig, initialData);
    setCurrentConfig(emptyConfig);
    try {
      const initialYaml = yamlDump(defaultContent, { lineWidth: -1 });
      setYaml(initialYaml);
    } catch (yamlErr) {
      console.error('Error converting default content to YAML:', yamlErr);
      setYaml(''); // Default to empty string on error
    }
    setError(null);
    setLoading(false);
    setSaved(false); // New config isn't saved yet
    return emptyConfig; // Return the created object
  }, [configType]); // Removed ensureMetadata dependency as it's initialized here
  // ensureMetadata might not be needed if initialized fully here

  // --- loadConfig (Original Implementation) ---
  const loadConfig = useCallback(async (id: string) => {
    if (id === 'new' || !id) { // Handle empty ID case as 'new'
      createNewConfig(); // Call function to set state
      return;
    }
    // --- UPDATED CHECK ---
    if (!checkApiServiceReady()) { // Check readiness directly from apiService
        console.log(`ConfigContext: Waiting for API service to be ready before loading config ${id}...`);
        setError("Waiting for shell configuration..."); // Set error to indicate waiting
        return; // Don't proceed if shell isn't ready
    }
    // --- END CHECK ---
    setLoading(true); setError(null); setSaved(false);
    try {
      const response = await apiService.getConfig(configType, id);
      if (!response) throw new Error(`Received null/undefined response for config ID: ${id}`);

      const config = response as Config; // Assert type based on shared definition

      // Validate the structure minimally before using
      if (!config || typeof config !== 'object' || !config.metadata || !('content' in config)) {
        console.error("ConfigContext: Invalid config structure received", { configResponse: config });
        throw new Error(`Invalid configuration structure received for ID: ${id}`);
      }

      ensureMetadata(config); // Ensure metadata structure is fully populated
      setCurrentConfig(config);
      emitConfigChange('loaded', config); // Emit event

      try {
        const yamlString = yamlDump(config.content, { lineWidth: -1 }); // [cite: 1389]
        setYaml(yamlString);
        setSaved(true); // Mark as saved on successful load [cite: 1389]
      } catch (yamlErr: any) {
        console.error('Error converting loaded config content to YAML:', yamlErr);
        setError(`Failed to convert configuration to YAML: ${yamlErr.message}`);
        setYaml(''); // Clear YAML on error
      }
    } catch (err: any) {
      setError(err.message || `Failed to load configuration: ${id}`); // [cite: 1391]
      console.error('Error loading configuration:', err);
      setCurrentConfig(null); setYaml('');
    } finally {
      setLoading(false);
    }
  }, [configType, createNewConfig, ensureMetadata, emitConfigChange]); // No longer depends on isShellReady state/prop

  // --- updateYaml (Original Implementation) ---
  const updateYaml = useCallback((newYaml: string) => {
    setYaml(newYaml);
    setSaved(false); // Mark as unsaved whenever YAML changes [cite: 1392]
  }, []); // [cite: 1392]

  // Function to save the current configuration
  // Updated signature to accept metadataOverrides
  const saveConfig = useCallback(async (idFromEditor?: string, commitMessageFromInput?: string, metadataOverrides?: Partial<Config['metadata']> ): Promise<Config | null> => {
    setLoading(true); setError(null);

    if (!currentConfig) {
      setError('No configuration selected to save'); setLoading(false); return null;
    }
    const isNew = !currentConfig.id || currentConfig.id === 'new' || currentConfig.id === '';

    // --- END CHECK ---
    const effectiveId = isNew ? idFromEditor?.trim() : currentConfig.id;

    if (!effectiveId || effectiveId.trim() === '') {
        setError('Configuration ID must be provided before saving.');
        setLoading(false); return null;
    }

    // Create a deep copy to avoid mutating state directly
    const configToSave: Config = JSON.parse(JSON.stringify(currentConfig));
    configToSave.id = effectiveId; // Set the correct ID
    configToSave.config_type = configType; // Ensure config type is correct

    // Ensure metadata exists and update timestamps/author
    ensureMetadata(configToSave);
    // Apply metadata overrides (like description) before updating timestamp
    if (metadataOverrides) {
        Object.assign(configToSave.metadata, metadataOverrides);
    }
    configToSave.metadata.updated_at = new Date().toISOString();
    configToSave.metadata.author = configToSave.metadata.author || "Current User"; // Ensure author exists
    if (isNew) {
      configToSave.metadata.created_at = new Date().toISOString();
    }

    try {
      // Parse content from YAML state
      let content;
      try {
          content = yamlLoad(yaml) as Record<string, any>;
          configToSave.content = content; // Update content in the copied object
      } catch (yamlErr: any) {
          setError(`Invalid YAML format: ${yamlErr.message}`);
          setLoading(false); return null;
      }

      const commitMessage = commitMessageFromInput || (isNew ? `Create ${configType} ${effectiveId}` : `Update ${configType} ${effectiveId}`);
      const author = configToSave.metadata.author; // Get author from the object

      let response: Config | null = null;

      if (isNew) {
        console.log(`ConfigContext: Creating config ${effectiveId}`);
        response = await apiService.createConfig(configType, configToSave, commitMessage, author);
      } else {
        console.log(`ConfigContext: Updating config ${effectiveId}`);
        response = await apiService.updateConfig(configType, effectiveId, configToSave, commitMessage, author);
      }

      if (!response) {
           throw new Error("Received no response from save operation.");
      }

      emitConfigChange('saved', response); // Emit event

      ensureMetadata(response); // Ensure response metadata is good
      setCurrentConfig(response); // Update state with the response from API

      try {
          // Update YAML state with potentially formatted content from response
          const updatedYaml = yamlDump(response.content, { lineWidth: -1 });
          setYaml(updatedYaml); // [cite: 1412]
      } catch(e) { console.error("Failed to dump YAML from save response", e); }

      setSaved(true); // Mark as saved
      await loadConfigs(); // Refresh the list
      return response; // Return the saved config

    } catch (err: any) {
      let errorDetail = err.message || 'An error occurred while saving';
      if (err.isAxiosError && err.response?.data?.detail) {
          errorDetail = `${err.response.status}: ${err.response.data.detail}`; // [cite: 1414]
      }
      setError(errorDetail);
      console.error('Error saving configuration:', err.response?.data || err);
      setSaved(false); // Ensure saved is false on error
      return null; // Return null on error
    } finally {
      setLoading(false); // [cite: 1417]
    }
  }, [currentConfig, yaml, configType, loadConfigs, ensureMetadata, emitConfigChange]); // No longer depends on isShellReady state/prop

  // Function to delete a configuration
  const deleteConfig = useCallback(async (id: string, commitMessage?: string) => {
    setLoading(true); setError(null);
    try {
      const configToDelete = currentConfig && currentConfig.id === id ? currentConfig : null;
      await apiService.deleteConfig(configType, id, commitMessage || `Deleted ${configType} ${id} via UI`, 'Current User');
      emitConfigChange('deleted', configToDelete); // Emit event
      await loadConfigs(); //dConfigs(); // Refresh list
      if (currentConfig && currentConfig.id === id) { // Clear state if current config was deleted
        setCurrentConfig(null); setYaml(''); setSaved(false);
      }
      // *** Publish event after successful delete and list reload ***
      eventBus.publish('configListUpdated', { source: 'config-selector', payload: { configType } });
      console.log(`ConfigContext: Published configListUpdated event for type ${configType} after delete.`);
    } catch (err: any) {
      setError(err.message || `Failed to delete configuration: ${id}`); console.error('Error deleting configuration:', err); // [cite: 1419]
    } finally {
      setLoading(false); // [cite: 1419]
    }
  }, [configType, loadConfigs, currentConfig, emitConfigChange]); // Dependencies for deleteConfig

  // Function to archive/unarchive a configuration
  const archiveConfig = useCallback(async (id: string, archive: boolean, author: string = "Current User") => {
    setLoading(true); setError(null);
    try {
      if (archive) {
        await apiService.archiveConfig(configType, id, author); // [cite: 1420]
      } else {
        await apiService.unarchiveConfig(configType, id, author); // [cite: 1420]
      }
      await loadConfigs(); // Refresh list
      if (currentConfig && currentConfig.id === id) {
        await loadConfig(id); // Reload to get updated metadata
      }
      // *** Publish event after successful archive/unarchive and list reload ***
      eventBus.publish('configListUpdated', { source: 'config-selector', payload: { configType } });
      console.log(`ConfigContext: Published configListUpdated event for type ${configType} after archive/unarchive.`);
    } catch (err: any) {
      const action = archive ? 'archive' : 'unarchive';
      setError(err.message || `Failed to ${action} configuration: ${id}`); console.error(`Error ${action}ing configuration:`, err); // [cite: 1421]
    } finally {
      setLoading(false); // [cite: 1421]
    }
  }, [configType, loadConfigs, currentConfig, loadConfig]); // Dependencies for archiveConfig

  // Function to clone a configuration
  const cloneConfig = useCallback(async (id: string, newId: string) => {
    setLoading(true); setError(null);
    if (!newId || !newId.trim()) {
         setError("New ID must be provided for cloning.");
         setLoading(false); return;
    }
    try {
      const clonedConfig = await apiService.cloneConfig(configType, id, newId.trim());
      await loadConfigs(); // Refresh list
      console.log(`ConfigContext: Cloned ${id} to ${newId}`, clonedConfig);
      // Optionally: emitConfigChange('loaded', clonedConfig); // Or navigate to it
    } catch (err: any) {
      // --- FIX: Corrected Syntax in catch block ---
      setError(err.message || `Failed to clone configuration: ${id}`);
      console.error('Error cloning configuration:', err);
    } finally {
      setLoading(false); // [cite: 1424]
    }
  }, [configType, loadConfigs]); // Dependencies for cloneConfig

  // Effect to load initial config if provided via prop
  useEffect(() => {
    // Check readiness *inside* the effect
    const ready = checkApiServiceReady();
    if (initialConfigId && ready) {
        console.log(`ConfigContext: API Service is ready and InitialConfigId prop detected: ${initialConfigId}. Loading...`);
      loadConfig(initialConfigId);
    } else if (initialConfigId && !ready) {
        console.log(`ConfigContext: InitialConfigId prop detected: ${initialConfigId}, but API Service is not ready yet.`);
    }
  }, [initialConfigId, loadConfig]); // Effect doesn't need to re-run when readiness changes, loadConfig checks internally
  // Added isShellReady dependency

  // Context value provided to consumers
  const contextValue: ConfigContextState = {
    configType, configs, currentConfig, yaml, loading, error, saved,
    loadConfigs, loadConfig, createNewConfig, updateYaml, saveConfig,
    deleteConfig, archiveConfig, cloneConfig
  }; // [cite: 1425]

  // Return provider with value (From Original)
  return (
    // Use the actual ConfigContext.Provider
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};

// Hook to use the context
export const useConfigContext = (): ConfigContextState => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    // This error means the hook is used outside of a ConfigProvider
    throw new Error('useConfigContext must be used within a ConfigProvider');
  }
  return context;
};