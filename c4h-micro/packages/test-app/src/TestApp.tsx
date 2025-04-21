/**
 * /packages/test-app/src/TestApp.tsx
 * Main component for the test-app microfrontend
 */
import React, { useEffect, useState } from 'react';
import { eventBus, EventDetail } from 'shared';

interface TestAppProps {
  // Any props passed from the shell
  eventBus?: typeof eventBus; // Optional - can also import directly
}

export default function TestApp({ eventBus: propEventBus }: TestAppProps) {
  // Use either the prop eventBus or import it directly
  const bus = propEventBus || eventBus;
  
  const [messageCount, setMessageCount] = useState<number>(0);
  const [lastMessage, setLastMessage] = useState<string>('');
  
  // Subscribe to events on mount
  useEffect(() => {
    // Example of subscribing to an event
    const unsubscribe = bus.subscribe('test:message', (detail: EventDetail) => {
      setMessageCount(prev => prev + 1);
      setLastMessage(JSON.stringify(detail.payload));
    });
    
    // Send a notification that we've mounted
    bus.publish('test:mounted', {
      source: 'test-app',
      payload: { timestamp: new Date().toISOString() }
    });
    
    // Clean up subscription on unmount
    return () => {
      unsubscribe();
      
      // Notify that we're unmounting
      bus.publish('test:unmounted', {
        source: 'test-app',
        payload: { timestamp: new Date().toISOString() }
      });
    };
  }, [bus]);
  
  // Example handler to publish an event
  const handleSendMessage = () => {
    bus.publish('test:ping', {
      source: 'test-app',
      payload: { message: 'Hello from Test App!', timestamp: new Date().toISOString() }
    });
  };
  
  return (
    <div style={{
      padding: '1rem',
      background: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '4px'
    }}>
      <h3>✅ Test App Loaded!</h3>
      <p>This is an ESM microfrontend using the shared event bus.</p>
      
      <div style={{ marginTop: '1rem' }}>
        <p>
          <strong>Message Count:</strong> {messageCount}
        </p>
        {lastMessage && (
          <p>
            <strong>Last Message:</strong> <code>{lastMessage}</code>
          </p>
        )}
        
        <button 
          onClick={handleSendMessage}
          style={{
            padding: '0.5rem 1rem',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Send Test Message
        </button>
      </div>
    </div>
  );
}