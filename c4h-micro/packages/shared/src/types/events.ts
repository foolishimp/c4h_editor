// File: packages/shared/src/types/events.ts (or a similar shared types file)

/**
 * Standard detail structure for internal CustomEvents dispatched on the eventBus.
 */
export interface EventDetail {
    source: string; // Unique identifier of the original sender (e.g., 'shell', 'config-editor', 'iframe:chat-client')
    payload: any;   // Data specific to the event type
  }