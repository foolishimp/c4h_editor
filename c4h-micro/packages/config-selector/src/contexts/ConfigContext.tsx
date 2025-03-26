// File: packages/config-selector/src/contexts/ConfigContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import { configTypes, apiService } from 'shared';

// Context state interface
interface ConfigContextState {
  configType: string;
  configs: any[];
  currentConfig: any | null;
  yaml: string;
  loading: boolean;
  error: string | null;
  saved: boolean;
  
  loadConfigs: () => Promise<void>;
  loadConfig: (id: string) => Promise<void>;
  createNewConfig: () => void;
  updateYaml: (yaml: string) => void;
  saveConfig: (configId?: string) => Promise<any | null>;
  deleteConfig: (id: string) => Promise<void>;
  archiveConfig: (id: string, archive: boolean) => Promise<void>;
  cloneConfig: (id: string, newId: string) => Promise<void>;
}

// Default context state
const defaultContextState: ConfigContextState = {
  configType: '',
  configs: [],
  currentConfig: null,
  yaml: '',
  loading: false,
  error: null,
  saved: false,
  
  loadConfigs: async () => {},
  loadConfig: async () => {},
  createNewConfig: () => {},
  updateYaml: () => {},
  saveConfig: async () => null,
  deleteConfig: async () => {},
  archiveConfig: async () => {},
  cloneConfig: async () => {}
};

// Create the context
const ConfigContext = createContext<ConfigContextState>(defaultContextState);

// Provider props
interface ConfigProviderProps {
  children: ReactNode;
  configType: string;
}

// Provider component
export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children, configType }) => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [currentConfig, setCurrentConfig] = useState<any | null>(null);
  const [yaml, setYaml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  
  // Load all configs
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getConfigs(configType);
      setConfigs(response as any[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load configurations');
      console.error('Error loading configurations:', err);
    } finally {
      setLoading(false);
    }
  }, [configType]);
  
  // Load a specific config
  const loadConfig = useCallback(async (id: string) => {
    // Special case for "new" - don't load from API
    if (id === 'new') {
      console.log("ConfigContext: Skipping API load for new config");
      createNewConfig();
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getConfig(configType, id);
      const config = response as any;
      
      // If the ID is empty, this is a new config but with preset ID
      const isNewConfig = !config.id || config.id === 'new';
      
      console.log(`Loaded config:`, {
        id: config.id,
        isNewConfig: isNewConfig,
        type: configType
      });
      
      setCurrentConfig(config);
      
      // Convert to YAML
      try {
        const yamlString = yamlDump(config.content);
        setYaml(yamlString);
      } catch (yamlErr: any) {
        console.error('Error converting to YAML:', yamlErr);
        setError(`Failed to convert configuration to YAML: ${yamlErr.message}`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to load configuration: ${id}`);
      console.error('Error loading configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [configType]);
  
  // Create a new config
  const createNewConfig = useCallback(() => {
    const defaultContent = configTypes[configType]?.defaultContent || {};
    
    const emptyConfig = {
      id: '',
      content: defaultContent,
      metadata: {
        author: 'Current User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: '',
        tags: []
      }
    };
    
    console.log('Creating new empty config:', emptyConfig);
    setCurrentConfig(emptyConfig);
    
    // Set initial YAML
    try {
      const initialYaml = yamlDump(defaultContent);
      setYaml(initialYaml);
    } catch (yamlErr) {
      console.error('Error converting default content to YAML:', yamlErr);
      setYaml('');
    }
    
    setError(null);
    setLoading(false);
  }, [configType]);
  
  // Update YAML content
  const updateYaml = useCallback((newYaml: string) => {
    setYaml(newYaml);
    setSaved(false);
  }, []);
  
  // Save the current config

  const saveConfig = useCallback(async (configId?: string) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    
    if (!currentConfig) {
      setError('No configuration to save');
      setLoading(false);
      return null;
    }

    try {
      // Parse YAML to object
      let content;
      try {
        content = yamlLoad(yaml);
      } catch (yamlErr: any) {
        setError(`Invalid YAML: ${yamlErr.message}`);
        setLoading(false);
        return null;
      }
      
      // Check if this is a new config or update
      const isNew = !currentConfig.id || currentConfig.id === 'new' || currentConfig.id === '';
      
      // Use the provided configId if available, otherwise use the current one
      const effectiveId = configId || currentConfig.id;
      
      console.log(`Saving ${isNew ? 'new' : 'existing'} config of type ${configType}:`, { 
        id: effectiveId,
        content, 
        metadata: currentConfig.metadata 
      });
      
      let response;
      
      if (isNew) {
        // For new config, create with content and metadata
        response = await apiService.createConfig(configType, {
          id: effectiveId,
          content,
          metadata: currentConfig.metadata,
          // Add these required fields
          commit_message: `Initial creation of ${configType} ${effectiveId}`,
          author: currentConfig.metadata.author || "Current User"
        });
      } else {
        // For existing config, update with content and metadata
        response = await apiService.updateConfig(configType, effectiveId, {
          content,
          metadata: currentConfig.metadata,
          // Add these required fields
          commit_message: `Update ${configType} ${effectiveId}`,
          author: currentConfig.metadata.author || "Current User"
        });
      }
      
      setCurrentConfig(response);
      setSaved(true);
      
      // Refresh the configs list
      await loadConfigs();
      
      return response;
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving');
      console.error('Error saving configuration:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentConfig, yaml, configType, loadConfigs]); 

  // Delete a config
  const deleteConfig = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await apiService.deleteConfig(configType, id, 'Deleted via UI', 'Current User');
      await loadConfigs();
      
      // Clear current config if it was deleted
      if (currentConfig && currentConfig.id === id) {
        setCurrentConfig(null);
        setYaml('');
      }
    } catch (err: any) {
      setError(err.message || `Failed to delete configuration: ${id}`);
      console.error('Error deleting configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [currentConfig, configType, loadConfigs]);
  
  // Archive/unarchive a config
  const archiveConfig = useCallback(async (id: string, archive: boolean) => {
    setLoading(true);
    setError(null);
    
    try {
      if (archive) {
        await apiService.archiveConfig(configType, id);
      } else {
        await apiService.unarchiveConfig(configType, id);
      }
      await loadConfigs();
      
      // Reload current config if it was archived/unarchived
      if (currentConfig && currentConfig.id === id) {
        await loadConfig(id);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${archive ? 'archive' : 'unarchive'} configuration: ${id}`);
      console.error(`Error ${archive ? 'archiving' : 'unarchiving'} configuration:`, err);
    } finally {
      setLoading(false);
    }
  }, [currentConfig, configType, loadConfigs, loadConfig]);
  
  // Clone a config
  const cloneConfig = useCallback(async (id: string, newId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await apiService.cloneConfig(configType, id, newId);
      await loadConfigs();
      
      // Load the new cloned config
      await loadConfig(newId);
    } catch (err: any) {
      setError(err.message || `Failed to clone configuration: ${id}`);
      console.error('Error cloning configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [configType, loadConfigs, loadConfig]);
  
  // Prepare context value
  const contextValue: ConfigContextState = {
    configType,
    configs,
    currentConfig,
    yaml,
    loading,
    error,
    saved,
    
    loadConfigs,
    loadConfig,
    createNewConfig,
    updateYaml,
    saveConfig,
    deleteConfig,
    archiveConfig,
    cloneConfig
  };
  
  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};

// Custom hook to use the context
export const useConfigContext = (): ConfigContextState => {
  const context = useContext(ConfigContext);
  return context;
};