# Microfrontend Development Guide for C4H Editor

## Overview

This guide explains how to create compliant microfrontend (MFE) applications that integrate seamlessly with the C4H Editor shell application. The architecture uses runtime ES module loading rather than traditional webpack module federation.

## Architecture Overview

### Key Components

1. **Shell Application** - The host container that orchestrates all MFEs
2. **Microfrontends** - Independent applications loaded at runtime
3. **Shared Package** - Common utilities, types, and services
4. **Event Bus** - Cross-MFE communication mechanism

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

### 2. Required Exports

Your MFE must export two functions in `src/main.tsx`:

#### Bootstrap Function
```typescript
export async function bootstrapMfe(mfeId: string) {
  console.log(`YourMFE: Bootstrap called for ${mfeId}`);
  
  try {
    // Import bootstrapConfig from shared package
    const result = await bootstrapConfig(mfeId);
    if (!result.success) {
      console.error(`YourMFE: Bootstrap failed: ${result.error}`);
      return { success: false, error: result.error };
    }
    return { success: true, config: result.config };
  } catch (error) {
    console.error(`YourMFE: Bootstrap error:`, error);
    return { success: false, error };
  }
}
```

#### Mount Function
```typescript
export function mount(props: MountProps) {
  const { domElement, appId = '', customProps = {} } = props;

  // Call bootstrap when mounted
  bootstrapMfe(appId)
    .catch(err => console.error(`YourMFE: Bootstrap error during mount:`, err));

  const root = createRoot(domElement);

  // Render with required providers
  root.render(
    <React.StrictMode>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={createTheme()}>
          <CssBaseline />
          <YourProvider>
            <YourApp {...customProps} />
          </YourProvider>
        </ThemeProvider>
      </StyledEngineProvider>
    </React.StrictMode>
  );

  // Return unmount function
  return {
    unmount: () => {
      console.log(`YourMFE: Unmounting appId: ${appId}`);
      root.unmount();
    }
  };
}
```

### 3. TypeScript Interfaces

Define proper TypeScript interfaces for your mount props:

```typescript
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
```

### 4. Package Configuration

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

## Integration with Shell

### 1. Event Bus Communication

Use the shared event bus for cross-MFE communication:

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

// Clean up subscriptions
unsubscribe();
```

### 2. API Service Integration

The shell configures the API service at startup. Your MFE can use it directly:

```typescript
import { apiService } from 'shared';

// Check if API is configured
if (checkApiServiceReady()) {
  // Make API calls
  const configs = await apiService.getConfigs('workorder');
}
```

### 3. Navigation Patterns

Handle navigation through props passed from the shell:

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
    } else {
      // Fallback to event bus
      eventBus.publish(EventTypes.NAVIGATION_REQUEST, {
        source: 'your-mfe',
        payload: { action: 'navigateTo', target: id }
      });
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

### 1. State Management

- Use React Context for local state within your MFE
- Use the event bus for cross-MFE communication
- Keep state isolated to prevent conflicts

### 2. Styling

- Use Material-UI components for consistency
- Apply `StyledEngineProvider` with `injectFirst` prop
- Avoid global CSS that might affect other MFEs

### 3. Error Handling

- Implement error boundaries within your MFE
- Handle bootstrap failures gracefully
- Provide meaningful error messages to users

### 4. Performance

- Lazy load heavy dependencies
- Implement code splitting where appropriate
- Clean up resources in unmount function

### 5. Testing

- Test mount/unmount lifecycle
- Test event bus interactions
- Test API integration with mocked services

## Common Patterns

### Loading States

```typescript
function YourApp() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await apiService.getData();
        setData(result);
      } finally {
        setLoading(false);
      }
    };
    
    if (checkApiServiceReady()) {
      loadData();
    }
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  return <YourContent data={data} />;
}
```

### Context Provider Pattern

```typescript
export const YourContext = React.createContext<YourContextType | null>(null);

export function YourProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<YourState>({});

  const value = useMemo(() => ({
    state,
    actions: {
      updateState: (newState: Partial<YourState>) => {
        setState(prev => ({ ...prev, ...newState }));
      }
    }
  }), [state]);

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
console.log(`[YourMFE] Action performed:`, data);
console.error(`[YourMFE] Error occurred:`, error);
```

### Development Tools

- Use React DevTools to inspect component hierarchy
- Use Network tab to monitor API calls
- Check browser console for event bus messages

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

## Example MFE

See the existing MFEs for reference implementations:
- `/packages/config-selector` - Configuration management MFE
- `/packages/job-management` - Job submission and monitoring MFE
- `/packages/yaml-editor` - YAML editing MFE

## Troubleshooting

### Common Issues

1. **MFE not loading**: Check environment configuration and CORS settings
2. **Context errors**: Ensure all required providers are included
3. **API calls failing**: Verify API service is configured by shell
4. **Events not received**: Check event subscription and cleanup

### Support

For questions or issues, contact the C4H Editor development team or refer to the main project documentation.