# Unified Microfrontend Development Guide for C4H Editor

## Overview

This guide provides comprehensive instructions for creating compliant microfrontend (MFE) applications that integrate seamlessly with the C4H Editor shell application. The architecture uses runtime ES module loading with standardized initialization patterns and clear communication mechanisms.

## Core Principles

- **Independent Initialization**: Each MFE is responsible for its own configuration and initialization
- **Runtime Isolation**: MFEs should function independently with minimal runtime dependencies
- **Clear Communication Patterns**: Use standardized methods for cross-MFE communication
- **Self-contained Builds**: Bundle shared code into consumers rather than relying on runtime resolution

## Architecture Overview

### Key Components

1. **Shell Application**: The host container that orchestrates all MFEs and exposes minimal global resources
2. **Microfrontends (MFEs)**: Independent applications following a consistent initialization pattern
3. **Shell Service**: Central configuration source accessed directly by all MFEs
4. **Event Bus**: Global communication mechanism accessible by all applications
5. **Shared Package**: Common utilities, types, and services

### Shell Responsibilities

- Render the main UI frame and provide navigation controls
- Inject shell service URL as a global: `window.__C4H_SHELL_SERVICE_URL__ = 'http://localhost:8011'`
- Mount MFEs and trigger their bootstrap process: `mfe.bootstrapConfig?.(appId)`
- Provide navigation callbacks as props to MFEs
- Initialize and expose the singleton event bus instance: `window.__C4H_EVENT_BUS__`

### Runtime Loading

MFEs are loaded dynamically at runtime using ES module imports:
```javascript
const module = await import(/* @vite-ignore */ appDef.url);
```

## Creating a Compliant MFE

### 1. Project Structure

```
packages/
└── your-mfe/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx         # Entry point with mount/unmount exports
        ├── YourApp.tsx      # Main component
        ├── components/      # UI components
        ├── contexts/        # React contexts
        ├── hooks/          # Custom hooks
        └── utils/          # Utility functions
```

### 2. Required Implementation Pattern

Your MFE must implement this standardized bootstrap and mount pattern in `src/main.tsx`:

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { apiService, configureApiService, checkApiServiceReady } from 'shared';
import YourApp from './YourApp';

// TypeScript interfaces
interface MountProps {
  domElement: HTMLElement;
  appId?: string;
  windowId?: number;
  customProps?: {
    configType?: string;
    onNavigateTo?: (id: string) => void;
    onNavigateBack?: () => void;
    [key: string]: any;
  };
}

// Export the bootstrap function for shell to call
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
    
    // Configure this MFE's services with correct endpoint
    configureApiService(config.serviceEndpoints.jobConfigServiceUrl);
    
    console.log(`[${mfeId}] Successfully bootstrapped with config`);
    return { success: true, config };
  } catch (error) {
    console.error(`[${mfeId}] Bootstrap failed:`, error);
    return { success: false, error };
  }
}

// Alternative name for compatibility
export async function bootstrapMfe(mfeId: string) {
  return bootstrapConfig(mfeId);
}

// Standard mount function with required providers
export function mount(props: MountProps) {
  const { domElement, appId = 'unknown-mfe', customProps = {} } = props;
  
  // Bootstrap if not already done (can be called again by shell)
  if (typeof bootstrapConfig === 'function') {
    bootstrapConfig(appId)
      .catch(err => console.error(`[${appId}] Bootstrap error during mount:`, err));
  }
  
  const root = createRoot(domElement);
  
  // Render with all required providers
  root.render(
    <React.StrictMode>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={createTheme()}>
          <CssBaseline />
          <YourApp {...customProps} />
        </ThemeProvider>
      </StyledEngineProvider>
    </React.StrictMode>
  );
  
  // Return unmount function
  return {
    unmount: () => {
      console.log(`[${appId}] Unmounting`);
      root.unmount();
    }
  };
}

export default YourApp;
```

### 3. Package Configuration

#### package.json
```json
{
  "name": "@c4h/your-mfe",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3006",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mui/material": "^5.14.0",
    "shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

#### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared': path.resolve(__dirname, '../shared/src')
    }
  },
  server: {
    cors: true,
    fs: {
      allow: ['..']
    }
  }
});
```

## Communication Patterns

### 1. Direct Props
For parent-child communication (Shell to MFE):
```typescript
interface YourAppProps {
  configType?: string;
  onNavigateTo?: (id: string) => void;
  onNavigateBack?: () => void;
}

function YourApp({ onNavigateTo, onNavigateBack }: YourAppProps) {
  const handleItemClick = (id: string) => {
    if (onNavigateTo) {
      onNavigateTo(id);
    }
  };
  
  return (
    <div>
      <Button onClick={onNavigateBack}>Back</Button>
      <Button onClick={() => handleItemClick('item-1')}>Go to Item 1</Button>
    </div>
  );
}
```

### 2. Event Bus
For cross-MFE communication using standard event types:
```typescript
import { eventBus, EventTypes } from 'shared';

// Subscribe to events
const unsubscribe = eventBus.subscribe(EventTypes.SHELL_CONFIG_READY, () => {
  console.log('Shell configuration is ready');
  // React to shell readiness
});

// Publish events
eventBus.publish(EventTypes.NAVIGATION_REQUEST, {
  source: 'your-mfe',
  payload: { action: 'navigateTo', target: 'some-id' }
});

// Clean up subscriptions on unmount
unsubscribe();
```

### 3. URL Parameters
For initial state or deep linking

### 4. Shell Service API
For configuration and preference management

## API Service Integration

Always check API service readiness before operations:

```typescript
import { apiService, checkApiServiceReady } from 'shared';

function YourComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // IMPORTANT: Always check if API is ready
      if (!checkApiServiceReady()) {
        console.error('[YourMFE] API service not ready');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const configs = await apiService.getConfigs('workorder');
        setData(configs);
      } catch (error) {
        console.error('[YourMFE] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  return <YourContent data={data} />;
}
```

## Common Failures and Solutions

### API Service Configuration Issues

**Problem**: MFEs attempt API operations before being properly configured with endpoints
- **Symptoms**: API calls fail with "API service not ready" errors
- **Solution**: Always check `checkApiServiceReady()` before operations, retry or block UI as needed

### Multiple Service Instances

**Problem**: Each MFE using its own instance of shared services loses configuration state
- **Symptoms**: One MFE configures a service but another finds it unconfigured
- **Solution**: Use self-initialization pattern with global window variables

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

## Environment Configuration

### 1. Register Your MFE

Add your MFE to `environments.json`:

```json
{
  "development": {
    "your-mfe": { 
      "url": "http://localhost:3006/src/main.tsx" 
    }
  },
  "production": {
    "your-mfe": { 
      "url": "https://cdn.example.com/your-mfe/latest/assets/your-mfe.js" 
    }
  }
}
```

### 2. Shell Configuration

The shell service will automatically discover your MFE if it's registered in the environment configuration.

## Best Practices

### State Management

- Use React Context for local state within your MFE
- Use the event bus for cross-MFE communication
- Keep state isolated to prevent conflicts
- Handle cases where configuration isn't immediately available

### Styling

- Use Material-UI components for consistency
- Apply `StyledEngineProvider` with `injectFirst` prop
- Avoid global CSS that might affect other MFEs
- Include `CssBaseline` for consistent baseline styles

### Error Handling

- Implement error boundaries within your MFE
- Handle bootstrap failures gracefully
- Provide meaningful error messages to users
- Always check service readiness before operations

### Performance

- Lazy load heavy dependencies
- Implement code splitting where appropriate
- Clean up resources in unmount function
- Use memoization for expensive computations

### Testing

- Test mount/unmount lifecycle
- Test event bus interactions
- Test API integration with mocked services
- Test bootstrap configuration flow

## Common Implementation Patterns

### Loading States with Error Handling

```typescript
function YourApp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!checkApiServiceReady()) {
          throw new Error('API service not configured');
        }
        
        const result = await apiService.getData();
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  
  return <YourContent data={data} />;
}
```

### Context Provider Pattern

```typescript
export const YourContext = React.createContext<YourContextType | null>(null);

export function YourProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<YourState>({});
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Wait for configuration to be ready
    const checkConfig = () => {
      if (checkApiServiceReady()) {
        setIsConfigured(true);
      }
    };
    
    checkConfig();
    const interval = setInterval(checkConfig, 1000);
    return () => clearInterval(interval);
  }, []);

  const value = useMemo(() => ({
    state,
    isConfigured,
    actions: {
      updateState: (newState: Partial<YourState>) => {
        setState(prev => ({ ...prev, ...newState }));
      }
    }
  }), [state, isConfigured]);

  return (
    <YourContext.Provider value={value}>
      {children}
    </YourContext.Provider>
  );
}
```

## Debugging

### Console Logging

Use consistent prefixes for console logs:

```typescript
const MFE_NAME = '[YourMFE]';

console.log(`${MFE_NAME} Action performed:`, data);
console.error(`${MFE_NAME} Error occurred:`, error);
console.warn(`${MFE_NAME} API not ready, retrying...`);
```

### Development Tools

- Use React DevTools to inspect component hierarchy
- Use Network tab to monitor API calls
- Check browser console for event bus messages
- Monitor window globals: `window.__C4H_SHELL_SERVICE_URL__`, `window.__C4H_EVENT_BUS__`

## Deployment

### Build Process

1. Build your MFE: `npm run build`
2. Deploy built files to CDN or static hosting
3. Update `environments.json` with production URL
4. Test integration with shell in staging environment

### Version Management

- Use semantic versioning for your MFE
- Coordinate updates with shell application
- Maintain backward compatibility when possible
- Document breaking changes in release notes

## Example MFEs

See the existing MFEs for reference implementations:
- `/packages/config-selector` - Configuration management MFE
- `/packages/job-management` - Job submission and monitoring MFE
- `/packages/yaml-editor` - YAML editing MFE

## Troubleshooting

### Common Issues and Solutions

1. **MFE not loading**
   - Check environment configuration URL is correct
   - Verify CORS settings allow cross-origin loading
   - Check browser console for module loading errors

2. **Context errors**
   - Ensure all required providers are included in mount function
   - Check that `StyledEngineProvider` has `injectFirst` prop

3. **API calls failing**
   - Verify API service is configured by checking `checkApiServiceReady()`
   - Check shell service URL is available: `window.__C4H_SHELL_SERVICE_URL__`
   - Verify endpoint configuration in bootstrap response

4. **Events not received**
   - Check event subscription is created before events are published
   - Verify event cleanup in unmount function
   - Check event bus is available: `window.__C4H_EVENT_BUS__`

5. **Bootstrap failures**
   - Check shell service is running and accessible
   - Verify configuration endpoint returns expected structure
   - Check network tab for failed requests

### Debug Checklist

- [ ] Is the shell service URL available in window global?
- [ ] Is the bootstrap function being called?
- [ ] Is the API service configured before use?
- [ ] Are all React providers included in mount?
- [ ] Are event subscriptions cleaned up on unmount?
- [ ] Is the MFE registered in environments.json?

## Support

For questions or issues, contact the C4H Editor development team or refer to the main project documentation.