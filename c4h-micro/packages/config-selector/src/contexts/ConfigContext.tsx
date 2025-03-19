// File: packages/config-selector/src/contexts/ConfigContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import { api, configTypes } from 'shared';

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
  saveConfig: () => Promise<any | null>;
  deleteConfig: (id: string) => Promise<void>;
  archiveConfig: (id: string, archive: boolean) => Promise<void>;
  cloneConfig: (id: string, newId: string) => Promise<void>;
}

// Create the context
const ConfigContext = createContext<ConfigContextState | undefined>(undefined);

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
  
  // Get the API endpoints for this config type
  const apiEndpoints = configTypes[configType]?.apiEndpoints || {
    list: `/api/v1/configs/${configType}`,
    get: (id: string) => `/api/v1/configs/${configType}/${id}`,
    create: `/api/v1/configs/${configType}`,
    update: (id: string) => `/api/v1/configs/${configType}/${id}`,
    delete: (id: string) => `/api/v1/configs/${configType}/${id}`,
    archive: (id: string) => `/api/v1/configs/${configType}/${id}/archive`,
    unarchive: (id: string) => `/api/v1/configs/${configType}/${id}/unarchive`,
    clone: (id: string) => `/api/v1/configs/${configType}/${id}/clone`
  };
  
  // Load all configs
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(apiEndpoints.list);
      setConfigs(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load configurations');
      console.error('Error loading configurations:', err);
    } finally {
      setLoading(false);
    }
  }, [configType, apiEndpoints]);
  
  // Load a specific config
  const loadConfig = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(apiEndpoints.get(id));
      setCurrentConfig(response.data);
      
      // Convert to YAML
      try {
        const yamlString = yamlDump(response.data.content);
        setYaml(yamlString);
      } catch (yamlErr) {
        console.error('Error converting to YAML:', yamlErr);
        setError('Failed to convert configuration to YAML');
      }
    } catch (err: any) {
      setError(err.message || `Failed to load configuration: ${id}`);
      console.error('Error loading configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [configType, apiEndpoints]);
  
  // Create a new config
  const createNewConfig = useCallback(() => {
    const emptyConfig = {
      id: '',
      content: {},
      metadata: {
        author: 'Current User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: '',
        tags: []
      }
    };
    
    setCurrentConfig(emptyConfig);
    setYaml(yamlDump({}));
    setError(null);
  }, []);
  
  // Update YAML content
  const updateYaml = useCallback((newYaml: string) => {
    setYaml(newYaml);
    setSaved(false);
  }, []);
  
  // Save the current config
  const saveConfig = useCallback(async () => {
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
      } catch (yamlErr) {
        setError(`Invalid YAML: ${yamlErr.message}`);
        setLoading(false);
        return null;
      }
      
      // Prepare request data
      const isNew = !currentConfig.id;
      const endpoint = isNew ? apiEndpoints.create : apiEndpoints.update(currentConfig.id);
      const requestData = isNew ? {
        id: currentConfig.id || `${configType}-${new Date().getTime()}`,
        content,
        metadata: currentConfig.metadata,
        commit_message: "Initial creation",
        author: currentConfig.metadata.author || "system"
      } : {
        content,
        metadata: currentConfig.metadata,
        commit_message: "Updated via editor",
        author: currentConfig.metadata.author || "system"
      };
      
      try {
        const response = await api.post(endpoint, requestData);
        setCurrentConfig(response.data);
        setSaved(true);
        
        // Refresh the configs list
        await loadConfigs();
        
        return response.data;
      } catch (err: any) {
        setError(err.message || 'Failed to save configuration');
        console.error('Error saving configuration:', err);
        return null;
      } finally {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving');
      setLoading(false);
      return null;
    }
  }, [currentConfig, yaml, configType, apiEndpoints, loadConfigs]);
  
  // Delete a config
  const deleteConfig = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await api.delete(`${apiEndpoints.delete(id)}?commit_message=Deleted&author=system`);
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
  }, [currentConfig, apiEndpoints, loadConfigs]);
  
  // Archive/unarchive a config
  const archiveConfig = useCallback(async (id: string, archive: boolean) => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = archive ? apiEndpoints.archive(id) : apiEndpoints.unarchive(id);
      await api.post(endpoint);
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
  }, [currentConfig, apiEndpoints, loadConfigs, loadConfig]);
  
  // Clone a config
  const cloneConfig = useCallback(async (id: string, newId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await api.post(apiEndpoints.clone(id), { new_id: newId });
      await loadConfigs();
      
      // Load the new cloned config
      await loadConfig(newId);
    } catch (err: any) {
      setError(err.message || `Failed to clone configuration: ${id}`);
      console.error('Error cloning configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoints, loadConfigs, loadConfig]);
  
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
export const useConfigContext = () => {
  const context = useContext(ConfigContext);
  
  if (context === undefined) {
    throw new Error('useConfigContext must be used within a ConfigProvider');
  }
  
  return context;
};
