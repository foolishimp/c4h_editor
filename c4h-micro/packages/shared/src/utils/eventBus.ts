/**
 * EventBus for cross-microfrontend communication
 * Provides a simple pub/sub mechanism for sharing events
 */
export interface EventDetail {
  source: string; // Identifier of the sender (e.g., 'shell', 'config-editor')
  payload: any;   // Data specific to the event type
}

type EventCallback = (event: CustomEvent<EventDetail>) => void;

class EventBus extends EventTarget {
  private events: Record<string, EventCallback[]> = {};

  constructor() {
    super();
  }

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    // Create a wrapper that converts EventTarget events to our callback format
    const wrappedCallback = (e: Event) => {
      callback(e as CustomEvent<EventDetail>);
    };
    
    // Store both the original and wrapped callback for cleanup
    this.events[event].push(callback);
    this.addEventListener(event, wrappedCallback);

    console.log(`EventBus: Subscribed to '${event}', total subscribers: ${this.events[event].length}`);

    // Return unsubscribe function
    return () => {
      this.removeEventListener(event, wrappedCallback);
      this.events[event] = this.events[event].filter(cb => cb !== callback); 
      console.log(`EventBus: Unsubscribed from '${event}', remaining subscribers: ${this.events[event].length}`);
    };
  }

  publish(event: string, detail: EventDetail): void {
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

// Note: We no longer attach to window.__C4H_EVENT_BUS__
// EventBus is now shared via ESM import/export and React Context