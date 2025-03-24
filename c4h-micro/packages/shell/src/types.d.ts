// File: packages/shell/src/types.d.ts

// YamlEditor microfrontend
declare module 'yamlEditor/YamlEditor' {
    import React from 'react';
    
    interface YamlEditorProps {
      yaml: string;
      onChange: (yaml: string) => void;
      onSave: () => Promise<void>;
      readOnly?: boolean;
      title?: string;
      description?: string;
    }
    
    const YamlEditor: React.FC<YamlEditorProps>;
    export default YamlEditor;
  }
  
  // ConfigSelector microfrontend
  declare module 'configSelector/ConfigManager' {
    import React from 'react';
    
    interface ConfigManagerProps {
      configType?: string;
      configId?: string;
    }
    
    const ConfigManager: React.FC<ConfigManagerProps>;
    export default ConfigManager;
  }
  
  // JobManagement microfrontend
  declare module 'jobManagement/JobManager' {
    import React from 'react';
    
    interface JobManagerProps {
      showJobCreator?: boolean;
    }
    
    const JobManager: React.FC<JobManagerProps>;
    export default JobManager;
  }