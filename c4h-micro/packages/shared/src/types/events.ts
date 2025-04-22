/**
 * /packages/shared/src/types/events.ts
 * Standard event types for cross-microfrontend communication
 */

/**
 * Standard detail structure for internal CustomEvents dispatched on the eventBus
 */
export interface EventDetail<T = any> {
    /**
     * Unique identifier of the sender (e.g., 'shell', 'config-editor', 'chat-client')
     */
    source: string;
    
    /**
     * Data specific to the event type
     */
    payload: T;
  }
  
  /**
   * Registry of standard event types and their expected payload structure
   * This enables better type checking and documentation
   */
  export enum EventTypes {
    // Configuration events
    CONFIG_LOADED = 'config:loaded',
    CONFIG_SAVED = 'config:saved',
    CONFIG_DELETED = 'config:deleted',
    CONFIG_LIST_UPDATED = 'config:list-updated',
    SHELL_CONFIG_READY = 'shell:config:ready', // Signal that shell has configured API service
    
    // Navigation events
    NAVIGATION_REQUEST = 'navigation:request',
    
    // Job events
    JOB_SUBMITTED = 'job:submitted',
    JOB_STATUS_CHANGED = 'job:status-changed',
    JOB_LIST_UPDATED = 'job:list-updated',
    
    // Notification events
    NOTIFICATION_SHOW = 'notification:show',
    
    // Chat/AI-related events
    CHAT_SEND_MESSAGE = 'chat:sendMessage',
    CHAT_PROVIDE_CONTEXT = 'chat:provideContext',
    
    // Test events for development
    TEST_MESSAGE = 'test:message',
    TEST_PING = 'test:ping',
    TEST_MOUNTED = 'test:mounted',
    TEST_UNMOUNTED = 'test:unmounted'
  }
  
  /**
   * Example of type-safe event payload definitions
   */
  export interface NavigationRequestPayload {
    action: 'back' | 'forward' | 'navigateTo';
    target?: string;
    from: string;
  }
  
  export interface NotificationPayload {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }
  
  export interface JobStatusPayload {
    jobId: string;
    status: string;
    result?: any;
  }