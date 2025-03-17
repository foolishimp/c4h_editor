// File: packages/shell/src/utils/eventListener.ts
/**
 * Event listener for cross-microfrontend communication
 * Subscribes to events from the shared event bus
 */
import { useEffect } from 'react';
import { eventBus } from 'shared';

/**
 * Custom hook to subscribe to microfrontend events
 * Automatically cleans up subscriptions on component unmount
 */
export const useEventBus = () => {
  useEffect(() => {
    console.log('Initializing event listeners in shell');
    
    // Listen for workorder saved event
    const unsubscribeWorkOrderSaved = eventBus.subscribe('workorder:saved', (workOrder) => {
      console.log('WorkOrder saved event received in shell:', workOrder);
      // Refresh the WorkOrder list if needed
      const workOrdersRefreshEvent = new CustomEvent('refreshWorkOrders');
      window.dispatchEvent(workOrdersRefreshEvent);
    });

    // Return cleanup function
    return () => {
      console.log('Cleaning up event listeners in shell');
      unsubscribeWorkOrderSaved();
    };
  }, []);
};