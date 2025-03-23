// packages/shared/src/components/RemoteComponent.tsx
import React, { useEffect, useState } from 'react';

interface RemoteComponentProps {
  url: string;
  scope: string;
  module: string;
  fallback?: React.ReactNode;
  props?: Record<string, any>;
}

const RemoteComponent: React.FC<RemoteComponentProps> = ({
  url,
  scope,
  module,
  fallback = <div>Loading remote component...</div>,
  props = {}
}) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url || !scope || !module) {
      setError(new Error('Missing required parameters to load remote component'));
      return;
    }

    const scriptId = `remote-${scope}-${module}`;
    if (document.getElementById(scriptId)) {
      // Script already loaded, try to get the component
      try {
        // @ts-ignore - Accessing window objects dynamically
        const container = window[scope];
        if (container) {
          const factory = container.get(module.replace(/^\.\//, ''));
          const RemoteComponent = factory();
          setComponent(() => RemoteComponent.default || RemoteComponent);
        }
      } catch (err) {
        console.error(`Error accessing existing remote component ${scope}/${module}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      return;
    }

    // Load the remote entry
    const script = document.createElement('script');
    script.src = url;
    script.id = scriptId;
    script.type = 'text/javascript';
    script.async = true;
    
    script.onload = () => {
      // @ts-ignore - Federation types not available
      window[scope].init(__webpack_share_scopes__.default);
      
      try {
        // @ts-ignore - Accessing window objects dynamically
        const container = window[scope];
        const factory = container.get(module.replace(/^\.\//, ''));
        const RemoteComponent = factory();
        setComponent(() => RemoteComponent.default || RemoteComponent);
      } catch (err) {
        console.error(`Error loading remote component ${scope}/${module}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    
    script.onerror = (err) => {
      console.error(`Error loading remote entry from ${url}:`, err);
      setError(new Error(`Failed to load script from ${url}`));
    };

    document.head.appendChild(script);

    return () => {
      if (document.getElementById(scriptId)) {
        document.head.removeChild(script);
      }
    };
  }, [url, scope, module]);

  if (error) {
    console.error('Error in RemoteComponent:', error);
    return (
      <div style={{ padding: '16px', color: '#f44336' }}>
        Error loading component: {error.message}
      </div>
    );
  }

  return Component ? <Component {...props} /> : <>{fallback}</>;
};

export default RemoteComponent;