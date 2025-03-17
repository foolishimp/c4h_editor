// File: packages/shell/src/utils/eventListener.ts
/**
 * Event listener for cross-microfrontend communication
 * Subscribes to events from the shared event bus
 */
import { eventBus } from 'shared';

// Initialize the event listeners
export const initEventListeners = () => {
  // Listen for workorder saved event
  const unsubscribeWorkOrderSaved = eventBus.subscribe('workorder:saved', (workOrder) => {
    console.log('WorkOrder saved event received:', workOrder);
    // Here you could trigger a refresh of the WorkOrder list
    // or update any other state in the shell application
  });

  // Return unsubscribe functions for cleanup
  return () => {
    unsubscribeWorkOrderSaved();
  };
};

// Export a function to inject the event listener into the App
export const withEventListener = (Component: React.ComponentType) => {
  return (props: any) => {
    React.useEffect(() => {
      const cleanup = initEventListeners();
      return cleanup;
    }, []);
    
    return <Component {...props} />;
  };
};
