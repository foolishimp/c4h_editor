# Microfrontend Integration Guidelines

## 1. Core Principles

- **Independent Initialization**: Each MFE is responsible for its own configuration and initialization
- **Runtime Isolation**: MFEs should function independently with minimal runtime dependencies
- **Clear Communication Patterns**: Use standardized methods for cross-MFE communication
- **Self-contained Builds**: Bundle shared code into consumers rather than relying on runtime resolution

## 2. Architecture Overview

- **Shell Application**: Orchestrates MFEs and exposes minimal global resources
- **Microfrontends (MFEs)**: Independent applications following a consistent initialization pattern
- **Shell Service**: Central configuration source accessed directly by all MFEs
- **Event Bus**: Global communication mechanism accessible by all applications

## 3. Shell Responsibilities

- Render the main UI frame and provide navigation controls
- Inject shell service URL as a global: `window.__C4H_SHELL_SERVICE_URL__ = 'http://localhost:8011'`
- Mount MFEs and trigger their bootstrap process: `mfe.bootstrapConfig?.(appId)`
- Provide navigation callbacks as props to MFEs
- Initialize and expose the singleton event bus instance: `window.__C4H_EVENT_BUS__`

## 4. MFE Implementation Requirements

- Export a standard bootstrap interface alongside mount function
- Always check configuration state before performing API operations
- Include required React context providers when mounting
- Handle cases where configuration isn't immediately available
- Manage internal state independently of other MFEs

## 5. Self-Initialization Pattern

All MFEs must implement this bootstrap pattern:

```typescript
export async function bootstrapConfig(mfeId: string) {
  // Get shell service URL from window global
  const shellServiceUrl = window.__C4H_SHELL_SERVICE_URL__;
  if (!shellServiceUrl) {
    console.error(`[${mfeId}] Shell service URL not found`);
    return { success: false, error: "Shell service URL not found" };
  }
  
  try {
    const response = await fetch(`${shellServiceUrl}/api/v1/shell/configuration`);
    const config = await response.json();
    
    // Configure this MFE's services
    configureApiService(config.serviceEndpoints.jobConfigServiceUrl);
    
    console.log(`[${mfeId}] Successfully bootstrapped with config`);
    return { success: true, config };
  } catch (error) {
    console.error(`[${mfeId}] Bootstrap failed:`, error);
    return { success: false, error };
  }
}
```

## 6. Communication Patterns

- **Direct Props**: For parent-child communication (Shell to MFE)
- **Event Bus**: For cross-MFE communication using standard event types
- **URL Parameters**: For initial state or deep linking
- **Shell Service API**: For configuration and preference management

## 7. Common Failures and Risks

### API Service Configuration Issues

**Problem**: MFEs attempt API operations before being properly configured with endpoints
- **Symptoms**: API calls fail with "API service not ready" errors
- **Solution**: Always check `checkApiServiceReady()` before operations, retry or block UI as needed

### Multiple Service Instances

**Problem**: Each MFE using its own instance of shared services loses configuration state
- **Symptoms**: One MFE configures a service but another finds it unconfigured
- **Solution**: Use self-initialization pattern or global instances

### React Context Boundary Issues

**Problem**: MUI components fail because they can't access ThemeProvider context
- **Symptoms**: "Invalid hook call" errors when crossing MFE boundaries
- **Solution**: Always include required providers when mounting MFEs

### Race Conditions During Initialization

**Problem**: Operations attempted during partial initialization state
- **Symptoms**: Inconsistent behavior, timing-dependent failures
- **Solution**: Implement proper loading states and initialization completion checks

### Configuration Type Mismatches

**Problem**: Shell and MFEs using different naming conventions for configs
- **Symptoms**: Empty data or "not found" errors
- **Solution**: Normalize config types between shell and components

## 8. Implementation Template for New MFEs

```typescript
// src/main.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MyComponent from './MyComponent';

// Export the bootstrap function for shell to call
export async function bootstrapConfig(mfeId) {
  const shellServiceUrl = window.__C4H_SHELL_SERVICE_URL__;
  if (!shellServiceUrl) return { success: false, error: "Shell service URL not found" };
  
  try {
    const response = await fetch(`${shellServiceUrl}/api/v1/shell/configuration`);
    const config = await response.json();
    
    // Configure API service with correct endpoint
    configureApiService(config.serviceEndpoints.jobConfigServiceUrl);
    return { success: true, config };
  } catch (error) {
    return { success: false, error };
  }
}

// Standard mount function with required providers
export function mount(props) {
  const { domElement, customProps = {} } = props;
  
  // Bootstrap if not already done (can be called again by shell)
  if (typeof bootstrapConfig === 'function') {
    bootstrapConfig(customProps.appId || 'unknown-mfe');
  }
  
  const root = createRoot(domElement);
  root.render(
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={createTheme()}>
        <CssBaseline />
        <MyComponent {...customProps} />
      </ThemeProvider>
    </StyledEngineProvider>
  );
  
  return {
    unmount() {
      root.unmount();
    }
  };
}

export default MyComponent;
```