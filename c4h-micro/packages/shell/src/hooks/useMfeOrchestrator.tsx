// File: /Users/jim/src/apps/c4h_editor_aidev/c4h-micro/packages/shell/src/hooks/useMfeOrchestrator.tsx
/**
 * /packages/shell/src/hooks/useMfeOrchestrator.tsx
 * Custom hook to handle the lifecycle (mounting, unmounting) of Microfrontends (MFEs).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Box, Typography, CircularProgress } from '@mui/material';
// Import types from shared package
import {
    AppDefinition, Frame, Preferences, LayoutDefinition, LayoutWindow,
    configTypes, AppAssignment, bootstrapConfig
} from 'shared';
import { useShellConfig } from '../contexts/ShellConfigContext';

// Define props for the hook
interface MfeOrchestratorProps {
    activeFrameId: string | null;
    config: Preferences | null;
    availableApps: AppDefinition[] | null;
    layouts: Record<string, LayoutDefinition> | null;
    onConfigNavigate: (action: 'navigateTo' | 'back', target?: string) => void;
}

// --- Error Boundary Component ---
interface MfeErrorBoundaryProps { children: React.ReactNode; mfeId: string; containerId: string; }
interface MfeErrorBoundaryState { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null; }
class MfeErrorBoundary extends React.Component<MfeErrorBoundaryProps, MfeErrorBoundaryState> { /* ... same correct version as before ... */
    constructor(props: MfeErrorBoundaryProps) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
    static getDerivedStateFromError(error: Error): Partial<MfeErrorBoundaryState> | null { return { hasError: true, error: error }; }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void { console.error(`MfeErrorBoundary (${this.props.mfeId} in ${this.props.containerId}): Uncaught error:`, error, errorInfo); this.setState({ errorInfo: errorInfo }); }
    render(): React.ReactNode { if (this.state.hasError) { return ( <Box sx={{ p: 2, color: 'error.main', border: '1px dashed red', height: '100%', overflow: 'auto' }}> <Typography variant="subtitle1" gutterBottom>Error Loading: {this.props.mfeId}</Typography> <Typography variant="caption" display="block">Container ID: {this.props.containerId}</Typography> <details style={{ whiteSpace: 'pre-wrap', marginTop: '0.5em', fontSize: '0.8em' }}> <summary>Details</summary> {this.state.error?.toString()} <br /> <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.errorInfo?.componentStack}</pre> </details> </Box> ); } return this.props.children; }
 }

// --- Container Creation Helper ---
const createWindowContainerRefCallback = ( frameId: string, windowId: number, containerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>> ): React.RefCallback<HTMLDivElement> => { const containerId = `mfe-container-${frameId}-window-${windowId}`; return (node: HTMLDivElement | null): void => { if (node) { containerRefs.current[containerId] = node; } }; };

// --- Single Container Component ---
interface SingleContainerProps { frameId: string | null; containerRef: React.RefCallback<HTMLDivElement>; }
const SingleContainerComponent: React.FC<SingleContainerProps> = ({ frameId, containerRef }) => ( <div ref={containerRef} id={`mfe-container-wrapper-${frameId || 'empty'}`} style={{ height: '100%', width: '100%', overflow: 'auto', position: 'relative' }}> <Typography sx={{ p: 1, fontStyle: 'italic', color: 'text.secondary', position: 'absolute', top: 0, left: 0 }}> {frameId ? 'Loading application...' : 'Select a tab.'} </Typography> </div> );
const SingleContainer = React.memo(SingleContainerComponent);

// --- Layout Container Component ---
interface LayoutContainerProps { frameId: string; layout: LayoutDefinition; containerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>; }
const LayoutContainerComponent: React.FC<LayoutContainerProps> = ({ frameId, layout, containerRefs }) => { console.log(`LayoutContainer rendering frame ${frameId} using layout ${layout.id}`); return ( <div id={`mfe-layout-container-${frameId}`} style={{ height: '100%', width: '100%', overflow: 'hidden', ...layout.containerStyle }}> {layout.windows.map((windowDef: LayoutWindow) => ( <div key={`window-${windowDef.id}`} ref={createWindowContainerRefCallback(frameId, windowDef.id, containerRefs)} id={`mfe-container-${frameId}-window-${windowDef.id}`} style={{ overflow: 'auto', position: 'relative', ...windowDef.style }}> <Typography sx={{ p: 1, fontStyle: 'italic', color: 'text.secondary', position: 'absolute', top: 0, left: 0 }}> {`Window ${windowDef.id}: Loading...`} </Typography> </div> ))} </div> ); };
const LayoutContainer = React.memo(LayoutContainerComponent);

// --- Main Hook ---
export function useMfeOrchestrator({ activeFrameId, config, availableApps, layouts: propLayouts, onConfigNavigate }: MfeOrchestratorProps) {
    const { fetchLayout } = useShellConfig();
    const windowContainersRef = useRef<Record<string, HTMLDivElement | null>>({});
    const mfeContainerRef = useRef<HTMLDivElement | null>(null);
    const mountedModulesRef = useRef<Record<string, { unmount: () => void; appId: string }>>({});
    const [layoutLoading, setLayoutLoading] = useState<boolean>(false);
    const [currentLayout, setCurrentLayout] = useState<LayoutDefinition | null>(null);

    useEffect(() => { windowContainersRef.current = {}; }, [activeFrameId]);

    // Helper to get current frame and layout
    const getActiveFrameAndLayout = useCallback(() => {
        if (!activeFrameId || !config?.frames) return { activeFrame: null, activeLayout: null, layoutId: null };
        const activeFrame = config.frames.find(f => f.id === activeFrameId);
        if (!activeFrame) return { activeFrame: null, activeLayout: null, layoutId: null };
        
        const layoutId = activeFrame.layoutId;
        let activeLayout: LayoutDefinition | null = null;
        
        if (layoutId && propLayouts && propLayouts[layoutId]) {
            activeLayout = propLayouts[layoutId];
        } else if (layoutId && currentLayout && currentLayout.id === layoutId) {
            activeLayout = currentLayout;
        }
        
        return { activeFrame, activeLayout, layoutId };
    }, [activeFrameId, config?.frames, propLayouts, currentLayout]);

    // Main Mount/Unmount Effect
    useEffect(() => {
        let isEffectActive = true;
        const currentFrameIdForMount = activeFrameId;
        console.log(`MFE Orchestrator: EFFECT RUNNING for Frame ID: ${currentFrameIdForMount}`);

        // --- Cleanup Function --- **MOVED TO TOP OF EFFECT SCOPE**
        const cleanupPreviousMfes = () => {
            console.log(`...Cleanup: Unmounting ${Object.keys(mountedModulesRef.current).length} modules.`);
            Object.entries(mountedModulesRef.current).forEach(([containerId, moduleInfo]) => {
                try { moduleInfo.unmount(); } catch (err) { console.error(`...Unmount error ${moduleInfo.appId}:`, err); }
                const containerElement = document.getElementById(containerId);
                if(containerElement) containerElement.innerHTML = '';
            });
            mountedModulesRef.current = {};
             if (mfeContainerRef.current) mfeContainerRef.current.innerHTML = '';
             windowContainersRef.current = {};
        };
        // --- END Cleanup Function ---

        // --- GUARD CLAUSE ---
        if (!currentFrameIdForMount || !config || !availableApps) {
            console.log(`Orchestrator Effect: Prerequisites not met (frameId=${currentFrameIdForMount}, config=${!!config}, apps=${!!availableApps}). Skipping mount.`);
            // Cleanup if frame becomes null or config disappears
            if (!currentFrameIdForMount || !config) {
                 cleanupPreviousMfes(); // Now declared above, safe to call
            }
            return; // Exit effect early
        }
        // --- END GUARD CLAUSE ---

        const { activeFrame, activeLayout, layoutId } = getActiveFrameAndLayout();
        
        // If we need a layout but don't have it yet, fetch it
        if (activeFrame && layoutId && !activeLayout && !layoutLoading) {
            console.log(`MFE Orchestrator: Need to fetch layout ${layoutId} for frame ${activeFrame.id}`);
            setLayoutLoading(true);
            
            fetchLayout(layoutId)
                .then(layout => {
                    if (isEffectActive && layout) {
                        console.log(`MFE Orchestrator: Successfully fetched layout ${layoutId}`);
                        setCurrentLayout(layout);
                        // Don't mount here - effect will re-run when currentLayout is updated
                    } else if (isEffectActive) {
                        console.error(`MFE Orchestrator: Failed to fetch layout ${layoutId}`);
                    }
                })
                .catch(err => {
                    if (isEffectActive) {
                        console.error(`MFE Orchestrator: Error fetching layout ${layoutId}:`, err);
                    }
                })
                .finally(() => {
                    if (isEffectActive) {
                        setLayoutLoading(false);
                    }
                });
                
            return; // Exit early, we'll come back when layout is fetched
        }

        const usingLayout = !!activeLayout;
        console.log(`  > usingLayout flag: ${usingLayout}`);

        // --- Mount Function ---
        const mountMfes = async () => {
            const { activeFrame: currentActiveFrame, activeLayout: currentActiveLayout } = getActiveFrameAndLayout();
            const currentUsingLayout = !!currentActiveLayout;

            if (!currentActiveFrame?.assignedApps || currentActiveFrame.assignedApps.length === 0) {
                 console.log(`...Mount Skip: No active frame or no assigned apps.`);
                 cleanupPreviousMfes(); // Use cleanup defined above
                  const placeholderText = '<div style="padding: 1em; font-style: italic;">Frame has no application assigned.</div>';
                  if (!currentUsingLayout && mfeContainerRef.current) mfeContainerRef.current.innerHTML = placeholderText;
                  else if (currentUsingLayout && currentActiveLayout?.windows?.[0]) { /* ... render placeholder in layout ... */ }
                 return;
            }

            console.log(`...Mounting ${currentActiveFrame.assignedApps.length} app(s) for frame ${currentFrameIdForMount}. Layout: ${currentUsingLayout}`);

            await Promise.all(currentActiveFrame.assignedApps.map(async (assignment: AppAssignment) => {
                // (Rest of mounting logic within map - same as before)
                 if (!isEffectActive) return;
                 const { appId, windowId } = assignment;
                 const appDef = availableApps.find(app => app.id === appId);
                 if (!appDef?.url) { console.error(`...Mount Error (Loop): AppDef/URL missing for ${appId}`); return; }
                 let targetContainerElement: HTMLElement | null = null;
                 let targetContainerId: string = '';
                 console.log(`...Loop: Processing appId=${appId}, windowId=${windowId}`);
                 if (currentUsingLayout && windowId && currentActiveLayout) { targetContainerId = `mfe-container-${currentFrameIdForMount}-window-${windowId}`; for (let i = 0; i < 5; i++) { targetContainerElement = document.getElementById(targetContainerId); if (targetContainerElement) break; await new Promise(resolve => setTimeout(resolve, 20 * i)); } console.log(`...Loop: Layout targetContainerId=${targetContainerId}, Found Element: ${!!targetContainerElement}`); }
                 else if (!currentUsingLayout) { targetContainerId = `mfe-container-wrapper-${currentFrameIdForMount}`; targetContainerElement = mfeContainerRef.current; console.log(`...Loop: Single targetContainerId=${targetContainerId}, Found Element: ${!!targetContainerElement}`); if (mountedModulesRef.current[targetContainerId]) { console.log(`...Mount Skip (Single): Container ${targetContainerId} occupied by ${mountedModulesRef.current[targetContainerId].appId}. Skipping ${appId}.`); return; } }
                 if (!targetContainerElement) { console.warn(`...Mount Skip (Loop): Container ${targetContainerId} not found for ${appId}.`); return; }
                 if (mountedModulesRef.current[targetContainerId]) { console.log(`...Mount Skip (Loop): Module ${mountedModulesRef.current[targetContainerId].appId} already mounted in ${targetContainerId}.`); return; }
                 targetContainerElement.innerHTML = ''; const loadingIndicator = document.createElement('div'); loadingIndicator.style.cssText = 'padding:1em; font-style:italic; color:grey;'; loadingIndicator.innerText = `Loading ${appDef.name}...`; targetContainerElement.appendChild(loadingIndicator);
                 const baseProps = { domElement: targetContainerElement, appId: appDef.id, windowId: windowId || 1 }; const customProps: Record<string, any> = {}; if (configTypes?.[appDef.id]) { Object.assign(customProps, { configType: appDef.id, onNavigateTo: (id: string) => onConfigNavigate('navigateTo', id), onNavigateBack: () => onConfigNavigate('back') }); }
                 try {
                     console.log(`...Importing ${appDef.id} from ${appDef.url}`); const module = await import(/* @vite-ignore */ appDef.url);
                     if (!isEffectActive || activeFrameId !== currentFrameIdForMount || !targetContainerElement?.isConnected) { if (targetContainerElement?.contains(loadingIndicator)) targetContainerElement.removeChild(loadingIndicator); console.log(`...Mount Abort ${appDef.id}`); return; }
                     if (targetContainerElement.contains(loadingIndicator)) targetContainerElement.removeChild(loadingIndicator);
                     let unmountFn: (() => void) | undefined = undefined; if (typeof module.bootstrapMfe === 'function') await module.bootstrapMfe(appDef.id); else await bootstrapConfig(appDef.id);
                     if (typeof module.mount === 'function') { const mountResult = module.mount({ ...baseProps, customProps }); unmountFn = mountResult?.unmount || module.unmount; }
                     else if (module.default && typeof module.default === 'function') { const ReactComponent = module.default; const root = ReactDOM.createRoot(targetContainerElement); root.render( <React.StrictMode> <MfeErrorBoundary mfeId={appDef.id} containerId={targetContainerId}> <ReactComponent {...baseProps} {...customProps} /> </MfeErrorBoundary> </React.StrictMode> ); unmountFn = () => { try { root.unmount(); } catch (e) { console.error(`Unmount error ${appDef.id}:`, e); }}; }
                     else { throw new Error(`Invalid MFE: ${appDef.id}`); }
                     if (unmountFn && typeof unmountFn === 'function') { mountedModulesRef.current[targetContainerId] = { unmount: unmountFn, appId: appDef.id }; console.log(`...Stored unmount for ${appDef.id} in ${targetContainerId}`); }
                     else { console.warn(`...No unmount fn for ${appDef.id}`); }
                 } catch (mountErr) { console.error(`Mount Error (${appDef.id} in ${targetContainerId}):`, mountErr); if (targetContainerElement?.contains(loadingIndicator)) targetContainerElement.removeChild(loadingIndicator); if(targetContainerElement) targetContainerElement.innerHTML = `<div style="color: red; padding: 1em;">Failed to mount ${appDef.name}. Check console.</div>`; }

            })); // End Promise.all map
        }; // End mountMfes function

        // --- Execute Logic ---
        cleanupPreviousMfes(); // Call cleanup defined above
        mountMfes().catch(err => console.error("Error during mountMfes:", err));

        // --- Return Cleanup for useEffect ---
        return () => {
            isEffectActive = false;
            console.log(`MFE Orchestrator: Effect cleanup running for frame ${currentFrameIdForMount}`);
            cleanupPreviousMfes(); // Call cleanup defined above
        };
    // Ensure all dependencies used within the effect are listed
    }, [activeFrameId, config, availableApps, propLayouts, onConfigNavigate, getActiveFrameAndLayout, fetchLayout, layoutLoading, currentLayout]);

    // --- MfeContainer Component Factory ---
    // useCallback depends on getActiveFrameAndLayout's dependencies now
    const MfeContainer = useCallback(() => {
        const { activeFrame, activeLayout } = getActiveFrameAndLayout(); // Call helper defined outside hook
        
        if (layoutLoading) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={40} />
                    <Typography sx={{ ml: 2 }}>Loading layout...</Typography>
                </Box>
            );
        }
        
        if (!activeFrameId || !activeFrame) {
            return <SingleContainer frameId={null} containerRef={(node) => { mfeContainerRef.current = node; }} />;
        }
        
        if (activeLayout) {
            return <LayoutContainer frameId={activeFrame.id} layout={activeLayout} containerRefs={windowContainersRef} />;
        }
        
        return <SingleContainer frameId={activeFrameId} containerRef={(node) => { mfeContainerRef.current = node; }} />;
    // Update dependency array for MfeContainer
    }, [activeFrameId, getActiveFrameAndLayout, layoutLoading]);

    return { MfeContainer };
} // End of useMfeOrchestrator Hook