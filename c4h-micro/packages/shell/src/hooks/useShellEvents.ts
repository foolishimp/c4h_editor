/**
 * /packages/shell/src/hooks/useShellEvents.ts
 * Custom hook to encapsulate shell event bus subscriptions and bridge setup.
 */
import { useEffect } from 'react';
// Import EventTypes as a value, not just a type
import { eventBus, EventTypes, EventDetail, NavigationRequestPayload } from 'shared';
import { setupEventBusBridge } from '../utils/eventBusBridge';

interface UseShellEventsProps {
    onNavigationRequest: (payload: NavigationRequestPayload) => void;
    onYamlEditRequest: (detail: EventDetail) => void;
}

export function useShellEvents({ onNavigationRequest, onYamlEditRequest }: UseShellEventsProps) {

    // Effect for setting up the iframe event bus bridge
    useEffect(() => {
        console.log("useShellEvents: Setting up event bus bridge.");
        const bridge = setupEventBusBridge(window);
        return () => {
            console.log("useShellEvents: Tearing down event bus bridge.");
            bridge.tearDown();
        };
    }, []); // Run only once on mount

    // Effect for handling navigation requests from MFEs
    useEffect(() => {
        const handleNavigation = (detail: EventDetail<NavigationRequestPayload>) => {
            if (detail?.payload) {
                 console.log(`useShellEvents: Received navigation request:`, detail.payload);
                 onNavigationRequest(detail.payload);
            } else {
                 console.warn("useShellEvents: Received navigation request with invalid payload:", detail);
            }
        };
        console.log("useShellEvents: Subscribing to navigation:request event.");
        // Use the EventTypes enum value correctly
        const unsubscribe = eventBus.subscribe(EventTypes.NAVIGATION_REQUEST, handleNavigation); // FIXED
        return () => {
           console.log("useShellEvents: Unsubscribing from navigation:request event.");
            unsubscribe();
        };
    }, [onNavigationRequest]); // Rerun if the callback changes

    // Effect for handling in-place YAML editor requests
    useEffect(() => {
        console.log("useShellEvents: Subscribing to config:edit:yaml event.");
        // Assuming 'config:edit:yaml' is a string literal type, not part of EventTypes enum
        const unsubscribe = eventBus.subscribe('config:edit:yaml', onYamlEditRequest);
        return () => {
            console.log("useShellEvents: Unsubscribing from config:edit:yaml event.");
            unsubscribe();
        };
    }, [onYamlEditRequest]); // Rerun if the callback changes

} // End of useShellEvents Hook