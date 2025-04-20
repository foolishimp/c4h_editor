// /Users/jim/src/apps/c4h_editor/c4h-micro/packages/config-selector/src/contexts/ConfigContext.tsx

// ** IMPORTS **
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'; // Ensure useContext is imported
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import { configTypes, apiService, Config } from 'shared'; // Import Config type from shared

// ** INTERFACE & DEFAULT STATE **
interface ConfigContextState {
  configType: string;
  configs: any[];
  currentConfig: any | null;
  yaml: string;
  loading: boolean;
  error: string | null;
  saved: boolean; // Tracks if the current state matches the last saved/loaded state

  // Functions
  loadConfigs: () => Promise<void>;
  loadConfig: (id: string) => Promise<void>;
  createNewConfig: () => void;
  updateYaml: (yaml: string) => void;
  saveConfig: (idToSave?: string, commitMessage?: string) => Promise<Config | null>;
  deleteConfig: (id: string, commitMessage?: string) => Promise<void>;
  archiveConfig: (id: string, archive: boolean, author?: string) => Promise<void>;
  cloneConfig: (id: string, newId: string, author?: string) => Promise<void>;
}

const defaultContextState: ConfigContextState = {
  configType: '',
  configs: [],
  currentConfig: null,
  yaml: '',
  loading: false,
  error: null,
  saved: false, // Initial state is not 'saved'

  // Default stub functions
  loadConfigs: async () => {},
  loadConfig: async () => {},
  createNewConfig: () => {},
  updateYaml: () => {},
  saveConfig: async () => null,
  deleteConfig: async () => {},
  archiveConfig: async () => {},
  cloneConfig: async () => {}
};

// *** FIX: Create the actual context using createContext ***
const ConfigContext = createContext<ConfigContextState>(defaultContextState);

// ** PROVIDER COMPONENT **
interface ConfigProviderProps {
  children: ReactNode;
  configType: string;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children, configType }) => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [currentConfig, setCurrentConfig] = useState<any | null>(null);
  const [yaml, setYaml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);

  // Helper function to ensure metadata structure
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
  }, []);

  // Function to load all configs
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getConfigs(configType);
      setConfigs(response || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load configurations');
      console.error('Error loading configurations:', err);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [configType]);

  // Function to create a new blank config state
  const createNewConfig = useCallback(() => {
    const defaultContent = configTypes[configType]?.defaultContent || {};
    const emptyConfig = {
      id: '', config_type: configType, content: defaultContent, metadata: {} // Metadata will be populated by ensureMetadata
    };
    ensureMetadata(emptyConfig); // Ensure standard metadata structure
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
  }, [configType, ensureMetadata]);

  // Function to load a specific config
  const loadConfig = useCallback(async (id: string) => {
    if (id === 'new') {
      createNewConfig();
      return;
    }
    setLoading(true); setError(null); setSaved(false);
    try {
      const response = await apiService.getConfig(configType, id);
      if (!response) throw new Error(`Received null/undefined response for config ID: ${id}`);
      const config = response as any;
      if (!config || typeof config !== 'object' || !config.metadata || !('content' in config)) {
        console.error("ConfigContext: Invalid config structure received", { configResponse: config });
        throw new Error(`Invalid configuration structure received for ID: ${id}`);
      }
      ensureMetadata(config); // Ensure metadata structure is valid
      setCurrentConfig(config);
      try {
        const yamlString = yamlDump(config.content, { lineWidth: -1 });
        setYaml(yamlString);
        setSaved(true); // Mark as saved on successful load
      } catch (yamlErr: any) {
        console.error('Error converting to YAML:', yamlErr);
        setError(`Failed to convert configuration to YAML: ${yamlErr.message}`);
        setYaml('');
      }
    } catch (err: any) {
      setError(err.message || `Failed to load configuration: ${id}`);
      console.error('Error loading configuration:', err);
      setCurrentConfig(null); setYaml('');
    } finally {
      setLoading(false);
    }
  }, [configType, createNewConfig, ensureMetadata]); // Correct dependencies

  // Function to update YAML state from editor changes
  const updateYaml = useCallback((newYaml: string) => {
    setYaml(newYaml);
    setSaved(false); // Mark as unsaved whenever YAML changes
  }, []);


  // File: /Users/jim/src/apps/c4h_editor/c4h-micro/packages/config-selector/src/contexts/ConfigContext.tsx
  // Corrected saveConfig function
  const saveConfig = useCallback(async (idFromEditor?: string, commitMessageFromInput?: string) => { // Renamed commitMessage param to avoid clash
    setLoading(true); setError(null);

    if (!currentConfig) {
      setError('No configuration selected to save'); setLoading(false); return null;
    }

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

      if (!response) {
          // Handle cases where API might return null/undefined unexpectedly
          throw new Error("Received no response from save operation.");
      }

      // Ensure metadata exists on the response before accessing it
      ensureMetadata(response); // Reuse your helper if needed, or access safely
      setCurrentConfig(response); // Update state with the response

      try {
          const updatedYaml = yamlDump(response.content, { lineWidth: -1 });
          setYaml(updatedYaml);
      } catch(e) { console.error("Failed to dump YAML from save response", e); }

      setSaved(true); // Mark as saved
      await loadConfigs(); // Refresh the list
      return response; // Return the saved config

    } catch (err: any) {
      let errorDetail = err.message || 'An error occurred while saving';
      if (err.isAxiosError && err.response?.data?.detail) {
          errorDetail = `${err.response.status}: ${err.response.data.detail}`;
      }
      setError(errorDetail);
      console.error('Error saving configuration:', err.response?.data || err);
      setSaved(false); // Ensure saved is false on error
      return null; // Return null on error
    } finally {
      setLoading(false);
    }
  }, [currentConfig, yaml, configType, loadConfigs, ensureMetadata]); // Added ensureMetadata dependency if needed  ;
  
  // *** FIX: Implement deleteConfig ***
  const deleteConfig = useCallback(async (id: string, commitMessage?: string) => {
    setLoading(true); setError(null);
    try {
      await apiService.deleteConfig(configType, id, commitMessage || `Deleted ${configType} ${id} via UI`, 'Current User');
      await loadConfigs(); // Refresh list
      if (currentConfig && currentConfig.id === id) { // Clear state if current config was deleted
        setCurrentConfig(null);
        setYaml('');
        setSaved(false);
      }
    } catch (err: any) {
      setError(err.message || `Failed to delete configuration: ${id}`); console.error('Error deleting configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [configType, loadConfigs, currentConfig]); // Added currentConfig dependency

  // *** FIX: Implement archiveConfig ***
  const archiveConfig = useCallback(async (id: string, archive: boolean, author: string = "Current User") => {
    setLoading(true); setError(null);
    try {
      if (archive) {
        await apiService.archiveConfig(configType, id, author);
      } else {
        await apiService.unarchiveConfig(configType, id, author);
      }
      await loadConfigs(); // Refresh list
      // Optionally reload current config if it was the one archived/unarchived
      if (currentConfig && currentConfig.id === id) {
        await loadConfig(id); // Reload to get updated metadata
      }
    } catch (err: any) {
      const action = archive ? 'archive' : 'unarchive';
      setError(err.message || `Failed to ${action} configuration: ${id}`); console.error(`Error ${action}ing configuration:`, err);
    } finally {
      setLoading(false);
    }
  }, [configType, loadConfigs, currentConfig, loadConfig]); // Added loadConfig dependency

  // *** FIX: Implement cloneConfig ***
  const cloneConfig = useCallback(async (id: string, newId: string) => {
    setLoading(true); setError(null);
    if (!newId || !newId.trim()) {
         setError("New ID must be provided for cloning.");
         setLoading(false);
         return; // Or throw error?
    }
    try {
      const clonedConfig = await apiService.cloneConfig(configType, id, newId.trim()); // Pass author too if API supports it
      await loadConfigs(); // Refresh list
      // Optionally navigate or load the new cloned config into the editor
      // await loadConfig(clonedConfig.id); // Example: load the new clone
      // For now, just log success
       console.log(`ConfigContext: Cloned ${id} to ${newId}`, clonedConfig);
    } catch (err: any) {
      setError(err.message || `Failed to clone configuration: ${id}`); console.error('Error cloning configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [configType, loadConfigs /* loadConfig if loading clone */]);

  // Context value provided to consumers
  const contextValue: ConfigContextState = {
    configType, configs, currentConfig, yaml, loading, error, saved,
    loadConfigs, loadConfig, createNewConfig, updateYaml, saveConfig,
    deleteConfig, archiveConfig, cloneConfig // Add implemented functions
  };

  return (
    // *** FIX: Use ConfigContext.Provider ***
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};

// *** FIX: Export the useConfigContext hook correctly ***
export const useConfigContext = (): ConfigContextState => {
  // *** FIX: Use useContext hook ***
  const context = useContext(ConfigContext);
  if (context === undefined) {
    // This error means the hook is used outside of a ConfigProvider
    throw new Error('useConfigContext must be used within a ConfigProvider');
  }
  return context;
};