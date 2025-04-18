// File: /Users/jim/src/apps/c4h_editor/c4h-micro/packages/config-selector/src/contexts/ConfigContext.tsx
// CORRECTED VERSION: Based on original code + eventBus integration

// ** IMPORTS **
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'; // Ensure useContext is imported
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
// *** ADD eventBus import ***
import { configTypes, apiService, eventBus } from 'shared'; // Assuming ConfigTypeMetadata is exported from shared

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
  saveConfig: (idFromEditor?: string, commitMessage?: string) => Promise<any | null>; // commitMessage is optional
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
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children, configType }) => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [currentConfig, setCurrentConfig] = useState<any | null>(null);
  const [yaml, setYaml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);

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
      const response = await apiService.getConfigs(configType); // [cite: 1384]
      setConfigs(response || []); // [cite: 1384]
    } catch (err: any) {
      setError(err.message || 'Failed to load configurations');
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
    if (id === 'new') {
      createNewConfig(); // [cite: 1387]
      return;
    }
    setLoading(true); setError(null); setSaved(false);
    try {
      const response = await apiService.getConfig(configType, id); // [cite: 1387]
      if (!response) throw new Error(`Received null/undefined response for config ID: ${id}`);
      const config = response as any; // [cite: 1387]
      if (!config || typeof config !== 'object' || !config.metadata || !('content' in config)) {
        console.error("ConfigContext: Invalid config structure received", { configResponse: config });
        throw new Error(`Invalid configuration structure received for ID: ${id}`);
      }
      ensureMetadata(config); // Ensure metadata structure is valid [cite: 1388]
      setCurrentConfig(config); // [cite: 1389]
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
  }, [configType, createNewConfig, ensureMetadata]); // [cite: 1392]

  // --- updateYaml (Original Implementation) ---
  const updateYaml = useCallback((newYaml: string) => {
    setYaml(newYaml);
    setSaved(false); // Mark as unsaved whenever YAML changes [cite: 1392]
  }, []); // [cite: 1392]

  // --- MODIFIED Save Function (Original Logic + eventBus) ---
  const saveConfig = useCallback(async (idFromEditor?: string, commitMessage?: string) => { // [cite: 1393]
    setLoading(true); setError(null);

    if (!currentConfig) {
      setError('No configuration selected to save'); setLoading(false); return null;
    }
    const isNew = !currentConfig.id || currentConfig.id === 'new' || currentConfig.id === ''; // [cite: 1393]
    const effectiveId = isNew ? idFromEditor?.trim() : currentConfig.id; // [cite: 1394]

    if (!effectiveId || effectiveId.trim() === '') {
        setError('Configuration ID must be provided via the editor before saving.');
        setLoading(false);
        return null;
    }
    const configToSave = { ...currentConfig }; // [cite: 1395]
    if (isNew) { configToSave.id = effectiveId; } // [cite: 1397]

    try {
      let content; // [cite: 1398]
      try { content = yamlLoad(yaml); } catch (yamlErr: any) { // [cite: 1398]
        setError(`Invalid YAML format: ${yamlErr.message}`); // [cite: 1398]
        setLoading(false); return null;
      }
      ensureMetadata(configToSave); // [cite: 1399]
      const metadataToSave = {
        ...(configToSave.metadata), // [cite: 1400]
        author: configToSave.metadata?.author || "Current User", // [cite: 1400]
        updated_at: new Date().toISOString(), // [cite: 1401]
        created_at: isNew ? new Date().toISOString() : configToSave.metadata?.created_at, // [cite: 1402]
        version: isNew ? '1.0.0' : configToSave.metadata?.version || '1.0.0' // [cite: 1403]
      };
      const requestData = { // [cite: 1404]
        content,
        metadata: metadataToSave,
        commit_message: commitMessage || `Update ${configType} ${effectiveId}`, // [cite: 1405]
        author: metadataToSave.author
      };

      let response; // [cite: 1405]
      if (isNew) { // [cite: 1406]
        console.log(`ConfigContext: Creating config ${effectiveId}`);
        response = await apiService.createConfig(configType, { id: effectiveId, ...requestData }); // [cite: 1407]
      } else { // [cite: 1408]
        console.log(`ConfigContext: Updating config ${effectiveId}`);
        response = await apiService.updateConfig(configType, effectiveId, requestData); // [cite: 1408]
      }

      ensureMetadata(response); // [cite: 1409]
      setCurrentConfig(response); // [cite: 1410]

      try {
          const updatedYaml = yamlDump(response.content, { lineWidth: -1 });
          setYaml(updatedYaml); // [cite: 1412]
      } catch(e) { console.error("Failed to dump YAML from save response", e); }

      setSaved(true); // [cite: 1412]
      await loadConfigs(); // [cite: 1413]
      // *** Publish event after successful save and list reload ***
      eventBus.publish('configListUpdated', { configType });
      console.log(`ConfigContext: Published configListUpdated event for type ${configType} after save.`);
      return response;

    } catch (err: any) {
      let errorDetail = err.message || 'An error occurred while saving'; // [cite: 1414]
      if (err.isAxiosError && err.response?.data?.detail) {
          errorDetail = `${err.response.status}: ${err.response.data.detail}`; // [cite: 1414]
      }
      setError(errorDetail); // [cite: 1416]
      console.error('Error saving configuration:', err.response?.data || err);
      setSaved(false); // [cite: 1416]
      return null;
    } finally {
      setLoading(false); // [cite: 1417]
    }
  }, [currentConfig, yaml, configType, loadConfigs, ensureMetadata]); // [cite: 1417]

  // --- MODIFIED Delete Function (Original Logic + eventBus) ---
  const deleteConfig = useCallback(async (id: string, commitMessage?: string) => { // [cite: 1418]
    setLoading(true); setError(null);
    try {
      await apiService.deleteConfig(configType, id, commitMessage || `Deleted ${configType} ${id} via UI`, 'Current User'); // [cite: 1418]
      await loadConfigs(); // Refresh list [cite: 1418]
      if (currentConfig && currentConfig.id === id) { // Clear state if current config was deleted [cite: 1418]
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
  }, [configType, loadConfigs, currentConfig]); // [cite: 1419]

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
      setError(err.message || `Failed to clone configuration: ${id}`); console.error('Error cloning configuration:', err); // [cite: 1423]
    } finally {
      setLoading(false); // [cite: 1424]
    }
  }, [configType, loadConfigs /* loadConfig if loading clone */]); // [cite: 1424]

  // Context value provided to consumers (From Original)
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
  return context; // [cite: 1429]
};