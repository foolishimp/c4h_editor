/**
 * /packages/test-app/src/TestApp.tsx
 * --- ADDED LOGGING for Event Bus Debugging ---
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Box, Typography } from '@mui/material';
import { eventBus as localEventBus } from 'shared'; // Import local instance

// Define expected structure for props if mount passes them
interface TestAppProps {
    name?: string;
    domElement?: HTMLElement;
    eventBus?: typeof localEventBus; // Allow passing bus via props (though likely unused now)
}

// Extend Window interface if necessary, or use type assertion carefully
declare global {
    interface Window {
        __C4H_EVENT_BUS__?: typeof localEventBus;
    }
}

const TestApp: React.FC<TestAppProps> = (props) => {
    const [messageCount, setMessageCount] = useState(0);
    const [lastMessage, setLastMessage] = useState<any>(null);

    // --- Determine which bus instance to use ---
    // Prioritize window global, fall back to local import
    const bus = window.__C4H_EVENT_BUS__ || localEventBus;
    const busSource = window.__C4H_EVENT_BUS__ ? 'window.__C4H_EVENT_BUS__' : 'localEventBus import';
    // Log which bus instance is selected on initial render
    console.log(`[TestApp] Initializing. Using event bus instance from: ${busSource}`);
    // --- End Bus Instance Determination ---


    // Callback to handle received messages
    const handleTestMessage = useCallback((detail: any) => {
         // --- ADDED LOG: Confirm handler execution ---
         console.log('[TestApp] handleTestMessage received:', detail);
         console.log('[TestApp] Current messageCount state BEFORE update:', messageCount);
        setLastMessage(detail);
        setMessageCount((prevCount) => {
             const newCount = prevCount + 1;
             // --- ADDED LOG: Confirm state update logic ---
             console.log(`[TestApp] Updating messageCount from ${prevCount} to ${newCount}`);
             return newCount;
         });
    }, [messageCount]); // Include messageCount dependency if needed by logic inside, though likely not needed here

    // Effect for subscribing and unsubscribing
    useEffect(() => {
        // --- ADDED LOG: Log which bus instance useEffect is using ---
        console.log(`[TestApp] useEffect running. Subscribing using bus from: ${busSource}`);

        // Subscribe using the selected bus instance
        const unsubscribe = bus.subscribe('test:ping', handleTestMessage);

        // Return cleanup function
        return () => {
            console.log(`[TestApp] useEffect cleanup. Unsubscribing using bus from: ${busSource}`);
            unsubscribe();
        };
    // Dependency array includes 'bus' to re-subscribe if the instance changes (unlikely now)
    // and handleTestMessage to ensure the latest callback is used.
    }, [bus, handleTestMessage, busSource]); // Added busSource for logging clarity


    const handleSendMessage = () => {
        const message = { timestamp: Date.now(), text: 'Ping from TestApp' };
         // --- ADDED LOG: Confirm message sending ---
         console.log(`[TestApp] Sending 'test:ping' using bus from: ${busSource}`, message);
        // Publish using the selected bus instance
        bus.publish('test:ping', { source: 'test-app', payload: message });
    };

    return (
        <Box sx={{ border: '2px dashed blue', p: 2, m: 1 }}>
            <Typography variant="h6">Test App</Typography>
            <Typography>Loaded successfully!</Typography>
            <Typography>Messages Received: {messageCount}</Typography>
            <Typography>Last Message:</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f0f0f0', padding: '5px' }}>
                {JSON.stringify(lastMessage, null, 2)}
            </pre>
            <Button variant="contained" onClick={handleSendMessage} sx={{ mt: 1 }}>
                Send Test Message (Ping)
            </Button>
             {/* Log the bus source being used */}
            <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                Using Event Bus from: {busSource}
            </Typography>
        </Box>
    );
};

export default TestApp;