// Fix in config/defaults.ts
import { ShellConfigurationResponse } from 'shared'; // Add this import


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
  frames: [
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
      type: 'ESM', // Add this required property
      url: 'http://localhost:3005/assets/test-app.js',
      scope: 'testApp', // Optional legacy property
      module: './TestApp' // Optional legacy property
    }
  ],
  serviceEndpoints: {}
}