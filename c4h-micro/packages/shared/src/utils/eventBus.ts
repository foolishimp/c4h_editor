// /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/shared/src/utils/eventBus.ts
/**
 * EventBus for cross-microfrontend communication
 * Provides a type-safe pub/sub mechanism based on EventTarget
 */

export interface EventDetail<T = any> {
  source: string; // Identifier of the sender (e.g., 'shell', 'config-editor')
  payload: T;    // Data specific to the event type
}

// Define two callback types to handle both internal and EventTarget use cases
type DetailCallback<T = any> = (detail: EventDetail<T>) => void;
type EventTargetCallback = (event: Event) => void;

// Track wrapper functions so we can properly unsubscribe
interface CallbackPair<T = any> {
  detailCallback: DetailCallback<T>;
  eventCallback: EventTargetCallback;
}

class EventBus extends EventTarget {
  private callbacks: Map<string, CallbackPair[]> = new Map();

  constructor() {
    super();
  }

  /**
   * Subscribe to an event
   * @param event Event type to subscribe to
   * @param callback Callback function to execute when event occurs
   * @returns Unsubscribe function
   */
  subscribe<T = any>(event: string, callback: DetailCallback<T>): () => void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }

    // Create wrapper to convert EventTarget events to strongly-typed callback
    const wrappedCallback = (e: Event) => {
      if (e instanceof CustomEvent) {
        const customEvent = e as CustomEvent<EventDetail<T>>;
        callback(customEvent.detail);
      } else {
        console.warn("EventBus received non-CustomEvent:", e);
      }
    };
    
    // Store both callbacks for cleanup
    const pair: CallbackPair<T> = {
      detailCallback: callback,
      eventCallback: wrappedCallback
    };
    this.callbacks.get(event)?.push(pair);
    
    // Add event listener to EventTarget
    this.addEventListener(event, wrappedCallback);

    const subscriberCount = this.callbacks.get(event)?.length || 0;
    console.log(`EventBus: Subscribed to '${event}', total subscribers: ${subscriberCount}`);

    // Return function to unsubscribe
    return () => {
      const callbackArray = this.callbacks.get(event);
      if (!callbackArray) return;

      const index = callbackArray.findIndex(p => p.detailCallback === callback);
      if (index >= 0) {
        const [removed] = callbackArray.splice(index, 1);
        this.removeEventListener(event, removed.eventCallback);
      }

      const remainingCount = callbackArray.length;
      console.log(`EventBus: Unsubscribed from '${event}', remaining subscribers: ${remainingCount}`);

      if (remainingCount === 0) {
        this.callbacks.delete(event);
      }
    };
  }

  /**
   * Publish an event to all subscribers
   * @param event Event type to publish
   * @param detail Event details to send
   */
  publish<T = any>(event: string, detail: EventDetail<T>): void {
    console.log(`EventBus: Publishing event '${event}'`, detail);
    
    // Create and dispatch a CustomEvent
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Export the event bus singleton
export { eventBus };

// Export as default for backward compatibility 
export default eventBus;