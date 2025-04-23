/**
 * /packages/shell/src/hooks/useMfeOrchestrator.tsx
 * Custom hook to handle the lifecycle (mounting, unmounting) of Microfrontends (MFEs).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useShellConfig } from '../contexts/ShellConfigContext';
import * as ReactDOM from 'react-dom/client';
import { Box, Typography, CircularProgress } from '@mui/material';
import { AppDefinition, Frame, MFEType, Preferences, LayoutDefinition, configTypes } from 'shared';

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

// Helper function to create a container ref for a specific window
const createWindowContainer = (frameId: string, windowId: number, containerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>) => {
    const containerId = `mfe-container-${frameId}-window-${windowId}`;
    return (node: HTMLDivElement) => {
        if (node) {
            containerRefs.current[containerId] = node;
        }
    };
};

// Component to render a single app container when no layout is defined
interface SingleContainerProps {
    frameId: string | null;
    containerRef: React.RefObject<HTMLDivElement>;
}

const SingleContainer: React.FC<SingleContainerProps> = ({ frameId, containerRef }) => (
    <div
        ref={containerRef}
        id={`mfe-container-wrapper-${frameId || 'empty'}`}
        style={{ height: '100%', width: '100%', overflow: 'auto' }}
    >
        {!frameId && <Typography sx={{ p: 3, fontStyle: 'italic' }}>Select a tab.</Typography>}
    </div>
);

// Component to render a multi-app layout container
interface LayoutContainerProps {
    frameId: string;
    layout: LayoutDefinition;
    containerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

const LayoutContainer: React.FC<LayoutContainerProps> = ({ frameId, layout, containerRefs }) => {
    return (
        <div
            id={`mfe-layout-container-${frameId}`}
            style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                ...layout.containerStyle
            }}
        >
            {layout.windows.map(window => (
                <div
                    key={`window-${window.id}`}
                    ref={createWindowContainer(frameId, window.id, containerRefs)}
                    id={`mfe-container-${frameId}-window-${window.id}`}
                    style={{
                        ...window.style,
                        overflow: 'auto',
                    }}
                >
                    <Typography sx={{ p: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                        {window.name} - Loading...
                    </Typography>
                </div>
            ))}
        </div>
    );
};

export function useMfeOrchestrator({ activeFrameId, config, availableApps, onConfigNavigate }: MfeOrchestratorProps) {
    // Get layout definitions from the shell config context
    const { layouts } = useShellConfig();
    
    // Ref to store container elements for each window of the active frame
    const windowContainersRef = useRef<Record<string, HTMLDivElement | null>>({});
    
    // Store unmount functions for currently mounted MFEs, keyed by container ID
    const mountedModulesRef = useRef<Record<string, { unmount: () => void; containerId: string }>>({});

    // For backward compatibility - traditional single container approach
    const mfeContainerRef = useRef<HTMLDivElement | null>(null);
    
    // Find the active frame and its layout definition
    const getActiveFrameAndLayout = useCallback(() => {
        if (!activeFrameId || !config || !config.frames) {
            return { activeFrame: null, activeLayout: null };
        }
        
        const activeFrame = config.frames.find(f => f.id === activeFrameId);
        if (!activeFrame) {
            return { activeFrame: null, activeLayout: null };
        }
        
        // Find layout definition if frame has layoutId
        let activeLayout = null;
        if (activeFrame.layoutId && layouts && layouts.length > 0) {
            activeLayout = layouts.find(l => l.id === activeFrame.layoutId) || null;
        }
        
        return { activeFrame, activeLayout };
    }, [activeFrameId, config, layouts]);

    // Effect for mounting/unmounting MFEs when activeFrameId or config changes
    useEffect(() => {
        let isEffectActive = true;
        const currentFrameIdForMount = activeFrameId; // Capture frame ID for this effect instance
        
        // Get active frame and layout
        const { activeFrame, activeLayout } = getActiveFrameAndLayout();
        
        // Determine if we're using a layout or single container
        const usingLayout = !!activeLayout;
        
        // Reference the appropriate container(s)
        const singleContainer = mfeContainerRef.current; // Traditional single container
        const currentWindowContainers = { ...windowContainersRef.current }; // Copy of window containers
        
        console.log(`useMfeOrchestrator: Mount Effect triggered. Frame ID: ${currentFrameIdForMount}, Using Layout: ${usingLayout}`);

        // --- Cleanup Function ---
        const cleanupPreviousMfes = () => {
            // Clean up all mounted modules
            Object.entries(mountedModulesRef.current).forEach(([id, moduleInfo]) => {
                if (moduleInfo?.unmount) {
                    console.log(`useMfeOrchestrator: Cleanup - Unmounting MFE with ID ${id}`);
                    try {
                        moduleInfo.unmount();
                    } catch (err) {
                        console.error(`useMfeOrchestrator: Cleanup - Error during unmount for module ${id}:`, err);
                    }
                }
            });
            
            // Reset mounted modules
            mountedModulesRef.current = {};
            
            // Clear container contents
            if (singleContainer) {
                singleContainer.innerHTML = '';
            }
            
            Object.values(currentWindowContainers).forEach(container => {
                if (container) {
                    container.innerHTML = '';
                }
            });
        };

        // Skip mounting if prerequisites are not met
        if (!activeFrameId || !config || !availableApps) {
            console.log("useMfeOrchestrator: Skipping mount (Prerequisites not met).");
            cleanupPreviousMfes();
            return () => {
                isEffectActive = false;
                cleanupPreviousMfes();
            };
        }

        // Verify we have a frame
        if (!activeFrame) {
            console.log(`useMfeOrchestrator: Skipping mount (Frame ${activeFrameId} not found).`);
            cleanupPreviousMfes();
            return () => {
                isEffectActive = false;
                cleanupPreviousMfes();
            };
        }

        // Verify frame has assigned apps
        if (!activeFrame.assignedApps || activeFrame.assignedApps.length === 0) {
            console.log(`useMfeOrchestrator: Frame ${activeFrameId} has no apps assigned.`);
            if (singleContainer) {
                singleContainer.innerHTML = '<div style="padding: 1em; font-style: italic;">Frame has no application assigned.</div>';
            }
            cleanupPreviousMfes();
            return () => {
                isEffectActive = false;
                cleanupPreviousMfes();
            };
        }

        // Create a map of window IDs to app assignments
        const windowAppMap: Record<number, any> = {};
        
        if (usingLayout) {
            // Process assignments with window IDs (for layout)
            activeFrame.assignedApps.forEach(assignment => {
                const windowId = assignment.windowId || 1; // Default to window 1 if not specified
                windowAppMap[windowId] = assignment;
            });
        } else {
            // For non-layout, we'll just use the first app assignment
            windowAppMap[1] = activeFrame.assignedApps[0];
        }

        // Mount apps in each window container
        const mountPromises: Promise<void>[] = [];
        
        // Process each window and its assigned app
        Object.entries(windowAppMap).forEach(([windowIdStr, assignment]) => {
            const windowId = parseInt(windowIdStr, 10);
            
            // Determine the container for this app
            let containerElement: HTMLDivElement | null = null;
            const containerId = usingLayout 
                ? `mfe-container-${activeFrameId}-window-${windowId}`
                : `mfe-container-wrapper-${activeFrameId}`;
                
            if (usingLayout) {
                containerElement = windowContainersRef.current[containerId];
            } else {
                containerElement = singleContainer;
            }
            
            // Skip if no container
            if (!containerElement) {
                console.warn(`useMfeOrchestrator: No container found for ${containerId}`);
                return; // Skip this iteration
            }
            
            // Find app definition
            const appDef = availableApps.find(app => app.id === assignment.appId);
            if (!appDef || !appDef.url) {
                console.error(`useMfeOrchestrator: App definition or URL missing for ${assignment.appId}`);
                containerElement.innerHTML = `<div style="color: red; padding: 1em;">Error: Cannot load app ${assignment.appId}. Definition or URL missing.</div>`;
                return; // Skip this iteration
            }
            
            // Clear container before new mount attempt
            containerElement.innerHTML = '';

            // Create loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.style.padding = '1em';
            loadingIndicator.innerText = `Loading ${appDef.name}...`;
            containerElement.appendChild(loadingIndicator);
            
            // Prepare props for this app
            const baseProps = { domElement: containerElement, appId: appDef.id, windowId };
            const customProps: Record<string, any> = {};
            
            // Add navigation props for config types
            if (configTypes && configTypes.hasOwnProperty(appDef.id)) {
                Object.assign(customProps, {
                    configType: appDef.id,
                    onNavigateTo: (id: string) => onConfigNavigate('navigateTo', id),
                    onNavigateBack: () => onConfigNavigate('back')
                });
            }
            
            // Import and mount the module
            const mountPromise = import(/* @vite-ignore */ appDef.url)
                .then(async module => {
                    // Check if effect is still active
                    if (!isEffectActive || activeFrameId !== currentFrameIdForMount || !containerElement?.isConnected) {
                        console.log(`useMfeOrchestrator: Aborting ESM mount for ${appDef.id} in window ${windowId}. Effect inactive or container disconnected.`);
                        if (containerElement?.contains(loadingIndicator)) {
                            try { containerElement.removeChild(loadingIndicator); } catch (e) { /* ignore */ }
                        }
                        return;
                    }
                    
                    // Remove loading indicator
                    if (containerElement.contains(loadingIndicator)) {
                        try { containerElement.removeChild(loadingIndicator); } catch (e) { /* ignore */ }
                    }
                    
                    console.log(`useMfeOrchestrator: ESM Module loaded for ${appDef.id} in window ${windowId}`, module);
                    
                    try {
                        // Bootstrap MFE if function exists
                        if (module.bootstrapMfe) {
                            console.log(`useMfeOrchestrator: Bootstrapping ${appDef.id} in window ${windowId}`);
                            await module.bootstrapMfe(appDef.id);
                        }
                        
                        let unmountFn: (() => void) | undefined = undefined;
                        
                        // Attempt to mount using standard methods
                        if (module.mount) {
                            console.log(`useMfeOrchestrator: Mounting ${appDef.id} via module.mount() in window ${windowId}`);
                            const mountResult = module.mount({ ...baseProps, customProps });
                            unmountFn = mountResult?.unmount || module.unmount;
                        } else if (module.default && typeof module.default === 'function') {
                            // Assume React Component export
                            console.log(`useMfeOrchestrator: Mounting ${appDef.id} as React component in window ${windowId}`);
                            const ReactComponent = module.default;
                            const root = ReactDOM.createRoot(containerElement);
                            
                            root.render(
                                <React.StrictMode>
                                    <MfeErrorBoundary frameId={currentFrameIdForMount}>
                                        <ReactComponent {...baseProps} {...customProps} />
                                    </MfeErrorBoundary>
                                </React.StrictMode>
                            );
                            
                            unmountFn = () => {
                                console.log(`useMfeOrchestrator: Unmounting React component ${appDef.id} in window ${windowId}`);
                                try { root.unmount(); } catch (e) { console.error("Error during reactRoot.unmount:", e); }
                            };
                        } else {
                            throw new Error(`Module ${appDef.id} is not a valid ESM MFE (no mount function or default React component export).`);
                        }
                        
                        // Store unmount function
                        if (unmountFn && typeof unmountFn === 'function') {
                            const moduleId = `${currentFrameIdForMount}-${windowId}-${appDef.id}`;
                            mountedModulesRef.current[moduleId] = { 
                                unmount: unmountFn,
                                containerId
                            };
                            console.log(`useMfeOrchestrator: Stored unmount function for ${moduleId}`);
                        }
                    } catch (mountErr) {
                        console.error(`useMfeOrchestrator: Error mounting/rendering ESM module ${appDef.id} in window ${windowId}:`, mountErr);
                        containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to mount/render application ${appDef.name}. Check console.</div>`;
                    }
                })
                .catch(importErr => {
                    if (!isEffectActive || activeFrameId !== currentFrameIdForMount || !containerElement?.isConnected) {
                        return;
                    }
                    
                    console.error(`useMfeOrchestrator: Error importing module ${appDef.id} from ${appDef.url}:`, importErr);
                    
                    if (containerElement.contains(loadingIndicator)) {
                        try { containerElement.removeChild(loadingIndicator); } catch(e) { /* ignore */ }
                    }
                    
                    containerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to load application module ${appDef.name}. Check console & network tab.</div>`;
                });
                
            mountPromises.push(mountPromise);
        });
        
        // Return cleanup function
        return () => {
            isEffectActive = false;
            console.log(`useMfeOrchestrator: Effect cleanup running for frame ${currentFrameIdForMount}`);
            cleanupPreviousMfes();
        };
    }, [activeFrameId, config, availableApps, onConfigNavigate, getActiveFrameAndLayout]);

    // Component to render the MFE container(s)
    const MfeContainer = useCallback(() => {
        // Get active frame and layout
        const { activeFrame, activeLayout } = getActiveFrameAndLayout();
        
        // Check if we have a valid frame and layout
        const hasLayout = activeFrame && activeLayout;
        
        // Render appropriate container
        if (!activeFrame) {
            return (
                <SingleContainer 
                    frameId={activeFrameId} 
                    containerRef={mfeContainerRef} 
                />
            );
        }
        
        if (hasLayout) {
            return (
                <LayoutContainer 
                    frameId={activeFrame.id} 
                    layout={activeLayout} 
                    containerRefs={windowContainersRef}
                />
            );
        }
        
        // Fallback to single container
        return (
            <SingleContainer 
                frameId={activeFrameId} 
                containerRef={mfeContainerRef} 
            />
        );
    }, [activeFrameId, getActiveFrameAndLayout]);

    // Return the component factory
    return { MfeContainer };
} // This closing brace should match the function definition's opening brace