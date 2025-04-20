import { ShellConfigurationResponse } from 'shared';

export const defaultShellConfiguration: ShellConfigurationResponse = {
  frames: [
    {
      id: 'test-frame',
      name: 'Test',
      order: 0,
      assignedApps: [{ appId: 'test-app' }]
    }
  ],
  availableApps: [
    {
      id: 'test-app',
      name: 'Test App',
      scope: 'testApp',
      module: './TestApp',
      url: 'http://localhost:3005/assets/test-app.js'
    }
  ],
  serviceEndpoints: {
    jobConfigServiceUrl: 'http://localhost:8011'
  }
};
