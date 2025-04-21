import { ShellConfigurationResponse } from 'shared';

export const defaultShellConfiguration: ShellConfigurationResponse = {
  preferences: {
    frames: [
      {
        id: 'test-frame',
        name: 'Test',
        order: 0,
        assignedApps: [{ appId: 'test-app' }]
      }
    ]
  },
  frames: [ // Maintaining backwards compatibility
    {
      id: 'test-frame',
      name: 'Test',
      order: 0,
      assignedApps: [{ appId: 'test-app' }]
    }
  ],
  mainBackendUrl: 'http://localhost:8000',
  availableApps: [
    {
      id: 'test-app',
      name: 'Test App', 
      scope: 'testApp',
      module: './TestApp',
      url: 'http://localhost:3005/assets/test-app.js',
      type: 'ESM'
    }
  ],
  serviceEndpoints: {
}}