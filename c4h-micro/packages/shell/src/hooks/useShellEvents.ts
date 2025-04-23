/**
 * /packages/shell/src/hooks/useShellEvents.ts
 * Custom hook to encapsulate shell event bus subscriptions and bridge setup.
 */
import { useEffect } from 'react';
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
        // Cleanup function for the bridge
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
        const unsubscribe = eventBus.subscribe(EventTypes.NAVIGATION_REQUEST, handleNavigation);
        // Cleanup function
        return () => {
            console.log("useShellEvents: Unsubscribing from navigation:request event.");
            unsubscribe();
        };
    }, [onNavigationRequest]); // Rerun if the callback changes

    // Effect for handling in-place YAML editor requests
    useEffect(() => {
        console.log("useShellEvents: Subscribing to config:edit:yaml event.");
        const unsubscribe = eventBus.subscribe('config:edit:yaml', onYamlEditRequest);
        // Cleanup function
        return () => {
            console.log("useShellEvents: Unsubscribing from config:edit:yaml event.");
            unsubscribe();
        };
    }, [onYamlEditRequest]); // Rerun if the callback changes

}