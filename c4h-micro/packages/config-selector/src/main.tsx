// File: packages/config-selector/src/main.tsx
import ConfigManager from './ConfigManager';

// Export ConfigManager as default export for direct import by the shell
export default ConfigManager;

// Also export the props interface explicitly for type checking
export type { ConfigManagerProps } from './ConfigManager';