/**
 * /packages/shell/src/hooks/useMfeOrchestrator.tsx
 * Custom hook to handle the lifecycle (mounting, unmounting) of Microfrontends (MFEs).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Box, Typography, CircularProgress } from '@mui/material';
import { AppDefinition, Frame, MFEType, Preferences, configTypes } from 'shared'; // Ensure Frame is imported if used

interface MfeOrchestratorProps {
    activeFrameId: string | null;
    config: Preferences | null;
    availableApps: AppDefinition[] | null;
    onConfigNavigate: (action: 'navigateTo' | 'back', target?: string) => void; // Callback for config navigation
}

// Define a simple Error Boundary specific to MFE loading
class MfeErrorBoundary extends React.Component<{ children: React.ReactNode, frameId: string | null }, { hasError: boolean, error: any }> {
    constructor(props: { children: React.ReactNode, frameId: string | null }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { console.error(`MfeErrorBoundary (Frame ${this.props.frameId}):`, error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ p: 2, color: 'error.main', border: '1px dashed red' }}>
                    <Typography variant="h6">Error Loading Application</Typography>
                    <Typography variant="body2">Failed to load or render the application for frame {this.props.frameId || 'unknown'}.</Typography>
                    <details style={{ whiteSpace: 'pre-wrap', marginTop: '0.5em', fontSize: '0.8em' }}>
                        <summary>Details</summary>
                        {this.state.error?.toString()}
                    </details>
                </Box>
            );
        }
        return this.props.children;
    }
}

export function useMfeOrchestrator({ activeFrameId, config, availableApps, onConfigNavigate }: MfeOrchestratorProps) {
    // Ref to store unmount functions for currently mounted MFEs
    // Keyed by frameId to handle cleanup correctly
    const mountedModulesRef = useRef<Record<string, { unmount: () => void }>>({});
    // Ref to track the container element for the active MFE
    const mfeContainerRef = useRef<HTMLDivElement | null>(null);

    // Effect for mounting/unmounting MFEs when activeFrameId or config changes
    useEffect(() => {
        let isEffectActive = true;
        const containerElement = mfeContainerRef.current; // Capture ref for this effect instance
        const currentFrameIdForMount = activeFrameId; // Capture frame ID for this effect instance

        // --- Cleanup Function ---
        // This cleanup runs BEFORE the next effect execution or on component unmount.
        // It should clean up the MFE related to the *previous* activeFrameId.
        const cleanupPreviousMfe = () => {
            // Find the module associated with the frameId this effect instance was for
            const moduleToUnmount = mountedModulesRef.current[currentFrameIdForMount!]; // Use non-null assertion after check
            if (currentFrameIdForMount && moduleToUnmount?.unmount) {
                console.log(`useMfeOrchestrator: Cleanup - Unmounting MFE for frame ${currentFrameIdForMount}`);
                try {
                    moduleToUnmount.unmount();
                } catch (err) {
                    console.error(`useMfeOrchestrator: Cleanup - Error during unmount for frame ${currentFrameIdForMount}:`, err);
                }
                // Remove the reference *after* attempting unmount
                delete mountedModulesRef.current[currentFrameIdForMount];
            }
            // Clear the container content associated with the previous frame
             // Check if container exists before clearing
            if (containerElement) {
                 containerElement.innerHTML = '';
            }
        };

        // --- Mounting Logic ---
        console.log(`useMfeOrchestrator: Mount Effect triggered. Frame ID: ${currentFrameIdForMount}`);

        // Prerequisite checks (container, config, apps)
        // Ensure container exists before proceeding with mount logic
        if (!containerElement || !currentFrameIdForMount || !config || !availableApps) {
            console.log("useMfeOrchestrator: Skipping mount (Prerequisites not met). Container:", containerElement);
             // Call cleanup in case a previous MFE was mounted before prerequisites failed
            cleanupPreviousMfe();
             // Return the cleanup function for this effect instance regardless
            return () => {
                 isEffectActive = false;
                 cleanupPreviousMfe();
            };
        }

        // Find Frame and App Definition (using only the FIRST assigned app for now)
        const activeFrame = config.frames?.find(f => f.id === currentFrameIdForMount);
        if (!activeFrame || !activeFrame.assignedApps || activeFrame.assignedApps.length === 0) {
            console.log(`useMfeOrchestrator: Skipping mount (Frame ${currentFrameIdForMount} invalid or no apps assigned).`);
            containerElement.innerHTML = '<div style="padding: 1em; font-style: italic;">Frame has no application assigned.</div>';
            cleanupPreviousMfe(); // Clean up potential previous content
            return () => { // Return cleanup for this effect
                isEffectActive = false;
                cleanupPreviousMfe();
            };
        }

        // --- TODO: Future enhancement for WO-LAYOUT-008 ---
        // This section needs to be updated to handle multiple apps based on layout
        // For now, it only mounts the first app.
        const assignment = activeFrame.assignedApps[0];
        const appDef = availableApps.find(app => app.id === assignment.appId);

        if (!appDef || !appDef.url) {
             console.error(`useMfeOrchestrator: Skipping mount (App definition or URL missing for ${assignment.appId}).`);
             containerElement.innerHTML = `<div style="color: red; padding: 1em;">Error: Cannot load app ${assignment.appId}. Definition or URL missing.</div>`;
             cleanupPreviousMfe();
             return () => { // Return cleanup for this effect
                 isEffectActive = false;
                 cleanupPreviousMfe();
             };
        }
        // --- End Single App Logic ---

        // Clear container *before* new mount attempt
        containerElement.innerHTML = '';

        // --- Mount Based on MFE Type (Simplified Example) ---
        const baseProps = { domElement: containerElement, appId: appDef.id };
        const customProps: Record<string, any> = {};
        // Check if the appDef.id is a known config type that needs navigation props
        if (configTypes && configTypes.hasOwnProperty(appDef.id)) {
            Object.assign(customProps, {
                configType: appDef.id,
                // Use passed-in callback for navigation
                onNavigateTo: (id: string) => onConfigNavigate('navigateTo', id),
                onNavigateBack: () => onConfigNavigate('back')
            });
        }

        // Only handle ESM for this example refactor
        console.log(`useMfeOrchestrator: Preparing to dynamically import ESM module for frame ${currentFrameIdForMount}, app ${appDef.id} from ${appDef.url}`);
        const loadingIndicator = document.createElement('div');
        loadingIndicator.style.padding = '1em';
        loadingIndicator.innerText = `Loading ${appDef.name}...`;
        containerElement.appendChild(loadingIndicator);

        import(/* @vite-ignore */ appDef.url).then(async module => {
            // Check conditions *inside* the async callback
            if (!isEffectActive || activeFrameId !== currentFrameIdForMount || !containerElement.isConnected) {
                 console.log(`useMfeOrchestrator: Aborting ESM mount for ${appDef.id}. Effect inactive, frame changed, or container disconnected.`);
                 if (containerElement.contains(loadingIndicator)) try { containerElement.removeChild(loadingIndicator); } catch (e) { /* ignore */ }
                 return; // Abort mount
            }
            // Remove loading indicator if still present
            if (containerElement.contains(loadingIndicator)) try { containerElement.removeChild(loadingIndicator); } catch (e) { /* ignore */ }

            console.log(`useMfeOrchestrator: ESM Module loaded for ${appDef.id}`, module);

            try {
                // Bootstrap MFE if function exists
                if (module.bootstrapMfe) {
                    console.log(`useMfeOrchestrator: Bootstrapping ${appDef.id}`);
                    await module.bootstrapMfe(appDef.id);
                    console.log(`useMfeOrchestrator: Bootstrap complete for ${appDef.id}`);
                }

                let unmountFn: (() => void) | undefined = undefined;
                // Attempt to mount using standard methods
                if (module.mount) {
                    console.log(`useMfeOrchestrator: Mounting ${appDef.id} via module.mount()`);
                    const mountResult = module.mount({ ...baseProps, customProps });
                    // Get unmount function from result or module itself
                    unmountFn = mountResult?.unmount || module.unmount;
                } else if (module.default && typeof module.default === 'function') { // Assume React Component export
                    console.log(`useMfeOrchestrator: Mounting ${appDef.id} as React component`);
                    const ReactComponent = module.default;
                    const root = ReactDOM.createRoot(containerElement);
                    // Wrap in error boundary for this specific MFE
                    root.render(
                        <React.StrictMode>
                            <MfeErrorBoundary frameId={currentFrameIdForMount}>
                                <ReactComponent {...baseProps} {...customProps} />
                            </MfeErrorBoundary>
                        </React.StrictMode>
                    );
                    unmountFn = () => {
                         console.log(`useMfeOrchestrator: Unmount - Unmounting React component ${appDef.id} in frame ${currentFrameIdForMount}`);
                         try { root.unmount(); } catch (e) { console.error("Error during reactRoot.unmount:", e); }
                    };
                } else {
                     throw new Error(`Module ${appDef.id} is not a valid ESM MFE (no mount function or default React component export).`);
                }

                // Store the unmount function if found
                if (unmountFn && typeof unmountFn === 'function') {
                    mountedModulesRef.current[currentFrameIdForMount] = { unmount: unmountFn };
                    console.log(`useMfeOrchestrator: Stored unmount function for ${currentFrameIdForMount}`);
                } else {
                     mountedModulesRef.current[currentFrameIdForMount] = { unmount: () => console.warn(`No-op unmount called for ${currentFrameIdForMount}`) };
                     console.warn(`useMfeOrchestrator: No valid unmount function found or stored for ${currentFrameIdForMount}`);
                }
            } catch (mountErr) {
                 console.error(`useMfeOrchestrator: Error mounting/rendering ESM module ${appDef.id}:`, mountErr);
                 // Display error inside the container
                 containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to mount/render application ${appDef.name}. Check console.</div>`;
                 // Clean up ref if mount failed
                 delete mountedModulesRef.current[currentFrameIdForMount];
            }

        }).catch(importErr => {
             // Check conditions *inside* the async callback
             if (!isEffectActive || activeFrameId !== currentFrameIdForMount || !containerElement.isConnected) {
                 console.log(`useMfeOrchestrator: Aborting ESM mount (in catch) for ${appDef.id}. Effect inactive, frame changed, or container disconnected.`);
                 return; // Abort if effect is no longer valid
             }
             console.error(`useMfeOrchestrator: Error dynamically importing module ${appDef.id} from ${appDef.url}:`, importErr);
             // Remove loading indicator if still present
             if (containerElement.contains(loadingIndicator)) try { containerElement.removeChild(loadingIndicator); } catch(e) { /* ignore */ }
             // Display error inside the container
             containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to load application module ${appDef.name}. Check console & network tab.</div>`;
             // Clean up ref if import failed
             delete mountedModulesRef.current[currentFrameIdForMount];
        });

        // Return the cleanup function for *this specific effect execution*
        return () => {
            isEffectActive = false; // Mark effect as inactive
            console.log(`useMfeOrchestrator: Effect cleanup running for frame ${currentFrameIdForMount}`);
            cleanupPreviousMfe(); // Call the cleanup logic
        };

    }, [activeFrameId, config, availableApps, onConfigNavigate]); // Dependencies for the main effect

    // --- Component to Render ---
    // This component provides the div container with the ref.
    // key prop removed to prevent unmounting/remounting the container itself on tab switch.
    const MfeContainer = useCallback(() => (
        <div
            ref={mfeContainerRef}
            id={`mfe-container-wrapper-${activeFrameId || 'empty'}`} // Use activeFrameId for ID
            style={{ height: '100%', width: '100%', overflow: 'auto' }}
        >
            {/* Content is mounted dynamically by the useEffect */}
            {!activeFrameId && <Typography sx={{ p: 3, fontStyle: 'italic' }}>Select a tab.</Typography>}
        </div>
    ), [activeFrameId]); // Depend on activeFrameId for the ID attribute

    // Return the component factory to be used in App.tsx
    return { MfeContainer };
} // This closing brace should match the function definition's opening brace