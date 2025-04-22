/**
 * /packages/shell/src/utils/eventBusBridge.ts
 * Event Bus Bridge for iframe communication
 * Allows MFEs in iframes to communicate with the main event bus
 */

/**
 * Sets up bidirectional communication between the global event bus
 * and iframe-hosted MFEs through postMessage.
 */
export function setupEventBusBridge(window: Window) {
  const eventBus = (window as any).__C4H_EVENT_BUS__;
  if (!eventBus) {
    console.error('EventBusBridge: Cannot find global event bus');
    return { tearDown: () => {} };
  }
  
  console.log('EventBusBridge: Setting up iframe communication bridge');
  
  // Function to get all iframe windows
  const getAllIframeWindows = () => {
    return Array.from(document.querySelectorAll('iframe'))
      .map(iframe => ({
        window: iframe.contentWindow,
        id: iframe.getAttribute('data-mfe-id') || 'unknown'
      }))
      .filter(item => item.window != null);
  };
  
  // Listen for messages from iframes
  const handleIframeMessage = (event: MessageEvent) => {
    // Skip messages without proper format
    if (!event.data || event.data.type !== 'c4h:event') {
      return;
    }
    
    // Extract event data
    const { eventType, detail, source } = event.data;
    
    console.log(`EventBusBridge: Received ${eventType} from iframe ${source}`);
    
    // Forward to global event bus
    eventBus.publish(eventType, {
      source: `iframe:${source || 'unknown'}`,
      payload: detail?.payload || detail
    });
  };
  
  // Handle events on the global bus to forward to iframes
  const handleBusEvent = (eventType: string, detail: any) => {
    // Don't forward events that originated from iframes back to them
    if (detail?.source?.startsWith('iframe:')) {
      return;
    }
    
    // Broadcast to all iframes
    getAllIframeWindows().forEach(({ window: frame, id }) => {
      if (frame) {
        frame.postMessage({
          type: 'c4h:event',
          eventType,
          detail,
          source: 'shell'
        }, '*'); // In production, specify target origin for security
      }
    });
  };
  
  // Set up event listeners
  window.addEventListener('message', handleIframeMessage);
  eventBus._addEventListener = eventBus.addEventListener; // Store original method
  eventBus.addEventListener = (type: string, listener: EventListener) => {
    eventBus._addEventListener(type, listener);
    handleBusEvent(type, {}); // Initial notification
  };
  
  // Return teardown function
  return {
    tearDown: () => {
      window.removeEventListener('message', handleIframeMessage);
      if (eventBus._addEventListener) {
        eventBus.addEventListener = eventBus._addEventListener;
        delete eventBus._addEventListener;
      }
      console.log('EventBusBridge: Bridge torn down');
    }
  };
}