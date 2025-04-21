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

// Store callbacks in their consumer-friendly form
type EventCallbackRecord = { callback: DetailCallback; listener: EventTargetCallback };

class EventBus extends EventTarget {
  private events: Map<string, Set<EventCallback>> = new Map();

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
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
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
    
    // Store callback in our registry with safe type handling
    const record: EventCallbackRecord = { callback, listener: wrappedCallback };
    this.events.get(event)?.add(record as unknown as EventCallback);
    
    // Add event listener to EventTarget
    this.addEventListener(event, wrappedCallback);

    const subscriberCount = this.events.get(event)?.size || 0;
    console.log(`EventBus: Subscribed to '${event}', total subscribers: ${subscriberCount}`);

    // Return function to unsubscribe
    return () => {
      this.removeEventListener(event, wrappedCallback);
      this.events.get(event)?.delete(callback as EventCallback);
      const remainingCount = this.events.get(event)?.size || 0;
      console.log(`EventBus: Unsubscribed from '${event}', remaining subscribers: ${remainingCount}`);

      if (remainingCount === 0) {
        this.events.delete(event);
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