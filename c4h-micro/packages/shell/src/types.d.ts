// File: /packages/shell/src/types.d.ts

// ConfigEditor microfrontend
declare module 'configEditor/ConfigEditor' {
    import React from 'react';
    const ConfigEditor: React.FC<any>;
    export default ConfigEditor;
  }
  
  // YamlEditor microfrontend
  declare module 'yamlEditor/YamlEditor' {
    import React from 'react';
    const YamlEditor: React.FC<any>;
    export default YamlEditor;
  }
  
  // ConfigSelector microfrontend
  declare module 'configSelector/ConfigManager' {
    import React from 'react';
    const ConfigManager: React.FC<any>;
    export default ConfigManager;
  }
  
  // JobManagement microfrontend
  declare module 'jobManagement/JobManager' {
    import React from 'react';
    const JobManager: React.FC<any>;
    export default JobManager;
  }