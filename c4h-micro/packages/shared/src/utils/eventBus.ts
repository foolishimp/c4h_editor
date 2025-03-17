// File: packages/shared/src/utils/eventBus.ts
/**
 * EventBus for cross-microfrontend communication
 * Provides a simple pub/sub mechanism for sharing events
 */

type EventCallback = (data: any) => void;

class EventBus {
  private events: Record<string, EventCallback[]> = {};

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  publish(event: string, data: any): void {
    if (!this.events[event]) {
      return;
    }

    this.events[event].forEach(callback => {
      callback(data);
    });
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Make available globally for cross-microfrontend communication
(window as any).__C4H_EVENT_BUS__ = eventBus;

export default eventBus;
