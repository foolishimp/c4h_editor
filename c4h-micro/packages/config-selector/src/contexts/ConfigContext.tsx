// ** IMPORTS **
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'; // Ensure useContext is imported
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import { configTypes, apiService, Config, eventBus } from 'shared'; // Import Config type and eventBus from shared

// ** INTERFACE & DEFAULT STATE ** (From Original)
interface ConfigContextState {
  configType: string;
  configs: any[];
  currentConfig: any | null;
  yaml: string;
  loading: boolean;
  error: string | null;
  saved: boolean; // Tracks if the current state matches the last saved/loaded state
  loadConfigs: () => Promise<void>;
  loadConfig: (id: string) => Promise<void>;
  createNewConfig: () => void;
  updateYaml: (yaml: string) => void;
  saveConfig: (idToSave?: string, commitMessage?: string) => Promise<Config | null>;
  deleteConfig: (id: string, commitMessage?: string) => Promise<void>;
  archiveConfig: (id: string, archive: boolean, author?: string) => Promise<void>;
  cloneConfig: (id: string, newId: string, author?: string) => Promise<void>;
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
  createNewConfig: () => {},
  updateYaml: () => {},
  saveConfig: async () => null,
  deleteConfig: async () => {},
  archiveConfig: async () => {},
  cloneConfig: async () => {}
};

// Create the context (From Original)
const ConfigContext = createContext<ConfigContextState>(defaultContextState);

// ** PROVIDER COMPONENT **
interface ConfigProviderProps {
  children: ReactNode;
  configType: string;
  initialConfigId?: string | null; // Add optional prop for initial ID
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children, configType, initialConfigId }) => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [currentConfig, setCurrentConfig] = useState<any | null>(null);
  const [yaml, setYaml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  
  // Emit config-related events to the event bus for cross-MFE communication
  const emitConfigChange = useCallback((action: 'loaded' | 'saved' | 'deleted', config: Config | null) => {
    eventBus.publish('config:change', {
      source: 'config-selector',
      payload: { action, configType, config }
    });
  }, [configType]);

  // --- ensureMetadata (Original Implementation) ---
  const ensureMetadata = useCallback((config: any) => {
    if (!config) return;
    if (!config.metadata) {
      config.metadata = {
        author: 'Current User', description: '', tags: [],
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), version: '1.0.0'
      };
    } else {
      if (config.metadata.description === undefined || config.metadata.description === null) {
        config.metadata.description = '';
      }
      if (!config.metadata.author) config.metadata.author = 'Current User';
      if (!config.metadata.tags) config.metadata.tags = [];
      if (!config.metadata.created_at) config.metadata.created_at = new Date().toISOString();
      if (!config.metadata.updated_at) config.metadata.updated_at = new Date().toISOString();
      if (!config.metadata.version) config.metadata.version = '1.0.0';
    }
  }, []); // [cite: 1382]

  // --- loadConfigs (Original Implementation) ---
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the shared apiService instance configured by the shell
      const response = await apiService.getConfigs(configType);
      setConfigs(response || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load configurations';
      setError(errorMsg);
      console.error(`ConfigContext: Error loading configs for type '${configType}'. API Response:`, err.response?.data); // Log the full response data
      console.error('Error loading configurations:', err);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [configType]); // [cite: 1384]

  // --- createNewConfig (Original Implementation) ---
  const createNewConfig = useCallback(() => {
    const defaultContent = configTypes[configType]?.defaultContent || {}; // [cite: 1385]
    const emptyConfig = {
      id: '', config_type: configType, content: defaultContent, metadata: {} // Metadata will be populated by ensureMetadata
    };
    ensureMetadata(emptyConfig); // Ensure standard metadata structure [cite: 1385]
    setCurrentConfig(emptyConfig);
    try {
      const initialYaml = yamlDump(defaultContent, { lineWidth: -1 });
      setYaml(initialYaml);
    } catch (yamlErr) {
      console.error('Error converting default content to YAML:', yamlErr);
      setYaml('');
    }
    setError(null);
    setLoading(false);
    setSaved(false); // New config isn't saved yet
  }, [configType, ensureMetadata]); // [cite: 1386]

  // --- loadConfig (Original Implementation) ---
  const loadConfig = useCallback(async (id: string) => {
    if (id === 'new' || !id) { // Handle empty ID as well
      createNewConfig();
      return;
    }
    setLoading(true); setError(null); setSaved(false);
    try {
      // Use the shared apiService instance configured by the shell
      const response = await apiService.getConfig(configType, id);
      if (!response) throw new Error(`Received null/undefined response for config ID: ${id}`);
      const config = response as any; // [cite: 1387]
      if (!config || typeof config !== 'object' || !config.metadata || !('content' in config)) {
        console.error("ConfigContext: Invalid config structure received", { configResponse: config });
        throw new Error(`Invalid configuration structure received for ID: ${id}`);
      }
      ensureMetadata(config); // Ensure metadata structure is valid
      setCurrentConfig(config);
      
      // Emit an event to the event bus when a config is loaded
      emitConfigChange('loaded', config);
      
      try {
        const yamlString = yamlDump(config.content, { lineWidth: -1 }); // [cite: 1389]
        setYaml(yamlString);
        setSaved(true); // Mark as saved on successful load [cite: 1389]
      } catch (yamlErr: any) {
        console.error('Error converting to YAML:', yamlErr);
        setError(`Failed to convert configuration to YAML: ${yamlErr.message}`); // [cite: 1390]
        setYaml('');
      }
    } catch (err: any) {
      setError(err.message || `Failed to load configuration: ${id}`); // [cite: 1391]
      console.error('Error loading configuration:', err);
      setCurrentConfig(null); setYaml('');
    } finally {
      setLoading(false);
    }
  }, [configType, createNewConfig, ensureMetadata, emitConfigChange]); // Added emitConfigChange to dependencies

  // --- updateYaml (Original Implementation) ---
  const updateYaml = useCallback((newYaml: string) => {
    setYaml(newYaml);
    setSaved(false); // Mark as unsaved whenever YAML changes [cite: 1392]
  }, []); // [cite: 1392]


  // File: /Users/jim/src/apps/c4h_editor/c4h-micro/packages/config-selector/src/contexts/ConfigContext.tsx
  // Corrected saveConfig function
  const saveConfig = useCallback(async (idFromEditor?: string, commitMessageFromInput?: string) => { // Renamed commitMessage param to avoid clash
    setLoading(true); setError(null);

    if (!currentConfig) {
      setError('No configuration selected to save'); setLoading(false); return null;
    }
    const isNew = !currentConfig.id || currentConfig.id === 'new' || currentConfig.id === ''; // [cite: 1393]
    const effectiveId = isNew ? idFromEditor?.trim() : currentConfig.id; // [cite: 1394]

    // Determine if it's a new config based on the original state
    const isNew = !currentConfig.id || currentConfig.id === 'new' || currentConfig.id === '';

    // Determine the ID to use
    const effectiveId = isNew ? idFromEditor?.trim() : currentConfig.id;

    if (!effectiveId || effectiveId.trim() === '') {
        setError('Configuration ID must be provided via the editor before saving.');
        setLoading(false);
        return null;
    }

    // Create a copy to modify and ensure structure
    const configToSave: Config = {
        // Start with spread of currentConfig to preserve parent_id, lineage etc.
        ...currentConfig,
        id: effectiveId, // Set the effective ID
        config_type: configType, // Ensure config_type is set from context
        metadata: { // Ensure metadata structure
            ...(currentConfig.metadata || {}), // Spread existing metadata
            author: currentConfig.metadata?.author || "Current User", // Use existing or default author
            updated_at: new Date().toISOString(),
            // If it's new, also set created_at
            created_at: isNew ? new Date().toISOString() : (currentConfig.metadata?.created_at || new Date().toISOString()),
            // Ensure version, tags, description, archived exist
            version: currentConfig.metadata?.version || '1.0.0',
            tags: currentConfig.metadata?.tags || [],
            description: currentConfig.metadata?.description || '',
            archived: currentConfig.metadata?.archived || false,
        },
        lineage: currentConfig.lineage || [], // Ensure lineage array exists
    };


    try {
      // Parse content from YAML state
      let content;
      try {
          content = yamlLoad(yaml) as Record<string, any>;
          configToSave.content = content; // Assign parsed content to the object we will save
      } catch (yamlErr: any) {
          setError(`Invalid YAML format: ${yamlErr.message}`); setLoading(false); return null;
      }

      // Determine commit message and author for the API call
      const commitMessage = commitMessageFromInput || (isNew ? `Create ${configType} ${effectiveId}` : `Update ${configType} ${effectiveId}`);
      const author = configToSave.metadata.author; // Author is now part of the config object

      let response: Config | null = null; // Use Config type for response

      // --- FIX: Call apiService methods with correct arguments ---
      if (isNew) {
        console.log(`ConfigContext: Creating config ${effectiveId}`);
        // Pass the full config object, then commit message and author separately
        response = await apiService.createConfig(configType, configToSave, commitMessage, author);
      } else {
        console.log(`ConfigContext: Updating config ${effectiveId}`);
        // Pass the full config object, then commit message and author separately
        response = await apiService.updateConfig(configType, effectiveId, configToSave, commitMessage, author);
      }
      // --- End Fix ---

      // Emit an event to the event bus when a config is saved
      emitConfigChange('saved', response);

      if (!response) {
          // Handle cases where API might return null/undefined unexpectedly
          throw new Error("Received no response from save operation.");
      }

      // Ensure metadata exists on the response before accessing it
      ensureMetadata(response); // Reuse your helper if needed, or access safely
      setCurrentConfig(response); // Update state with the response

      try {
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
  }, [currentConfig, yaml, configType, loadConfigs, ensureMetadata, emitConfigChange]); // Added emitConfigChange dependency if needed  ;
  
  // *** FIX: Implement deleteConfig ***
  const deleteConfig = useCallback(async (id: string, commitMessage?: string) => {
    setLoading(true); setError(null);
    try {
      await apiService.deleteConfig(configType, id, commitMessage || `Deleted ${configType} ${id} via UI`, 'Current User');
      
      // Emit an event to the event bus when a config is deleted
      emitConfigChange('deleted', currentConfig && currentConfig.id === id ? currentConfig : null);
      
      await loadConfigs(); // Refresh list
      if (currentConfig && currentConfig.id === id) { // Clear state if current config was deleted
        setCurrentConfig(null);
        setYaml('');
        setSaved(false);
      }
      // *** Publish event after successful delete and list reload ***
      eventBus.publish('configListUpdated', { configType });
      console.log(`ConfigContext: Published configListUpdated event for type ${configType} after delete.`);
    } catch (err: any) {
      setError(err.message || `Failed to delete configuration: ${id}`); console.error('Error deleting configuration:', err); // [cite: 1419]
    } finally {
      setLoading(false); // [cite: 1419]
    }
  }, [configType, loadConfigs, currentConfig, emitConfigChange]); // Added emitConfigChange dependency

  // --- MODIFIED Archive Function (Original Logic + eventBus) ---
  const archiveConfig = useCallback(async (id: string, archive: boolean, author: string = "Current User") => { // [cite: 1420]
    setLoading(true); setError(null);
    try {
      if (archive) {
        await apiService.archiveConfig(configType, id, author); // [cite: 1420]
      } else {
        await apiService.unarchiveConfig(configType, id, author); // [cite: 1420]
      }
      await loadConfigs(); // Refresh list [cite: 1421]
      if (currentConfig && currentConfig.id === id) { // [cite: 1421]
        await loadConfig(id); // Reload to get updated metadata [cite: 1421]
      }
      // *** Publish event after successful archive/unarchive and list reload ***
      eventBus.publish('configListUpdated', { configType });
      console.log(`ConfigContext: Published configListUpdated event for type ${configType} after archive/unarchive.`);
    } catch (err: any) {
      const action = archive ? 'archive' : 'unarchive';
      setError(err.message || `Failed to ${action} configuration: ${id}`); console.error(`Error ${action}ing configuration:`, err); // [cite: 1421]
    } finally {
      setLoading(false); // [cite: 1421]
    }
  }, [configType, loadConfigs, currentConfig, loadConfig]); // [cite: 1421]

  // --- MODIFIED Clone Function (Original Logic + eventBus) ---
  const cloneConfig = useCallback(async (id: string, newId: string) => { // [cite: 1422]
    setLoading(true); setError(null);
    if (!newId || !newId.trim()) {
         setError("New ID must be provided for cloning."); // [cite: 1422]
         setLoading(false);
         return;
    }
    try {
      const clonedConfig = await apiService.cloneConfig(configType, id, newId.trim()); // [cite: 1423]
      await loadConfigs(); // Refresh list [cite: 1423]
      // *** Publish event after successful clone and list reload ***
      eventBus.publish('configListUpdated', { configType });
      console.log(`ConfigContext: Cloned ${id} to ${newId}. Published configListUpdated event for type ${configType}.`, clonedConfig); // [cite: 1423]
    } catch (err: any) {
      setError( any) {
      setError(err.message || `Failed to clone configuration: ${id}`); console.error('Error cloning configuration:', err);
    } finally {
      setLoading(false); // [cite: 1424]
    }
  }, [configType, loadConfigs /* loadConfig if loading clone */]); // [cite: 1424]

  // Effect to load initial config if provided via prop
  useEffect(() => {
    if (initialConfigId) {
      loadConfig(initialConfigId);
    }
  }, [initialConfigId, loadConfig]); // Depend on initialConfigId and loadConfig

  // Context value provided to consumers
  const contextValue: ConfigContextState = {
    configType, configs, currentConfig, yaml, loading, error, saved,
    loadConfigs, loadConfig, createNewConfig, updateYaml, saveConfig,
    deleteConfig, archiveConfig, cloneConfig
  }; // [cite: 1425]

  // Return provider with value (From Original)
  return (
    <ConfigContext.Provider value={contextValue}> {/* [cite: 1426] */}
      {children}
    </ConfigContext.Provider>
  );
};

// Hook to use the context (From Original)
export const useConfigContext = (): ConfigContextState => { // [cite: 1427]
  const context = useContext(ConfigContext); // [cite: 1427]
  if (context === undefined) { // [cite: 1428]
    throw new Error('useConfigContext must be used within a ConfigProvider'); // [cite: 1428]
  }
  return context;
};
}