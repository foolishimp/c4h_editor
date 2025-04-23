import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // Need axios for the direct PUT call
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton,
    Typography, Box, List, ListItem, ListItemText, ListItemIcon,
    CircularProgress, Alert, Divider, TextField, Select, MenuItem,
    FormControl, InputLabel, SelectChangeEvent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';

// Use the context hook to get the correct URL for the preferences service
import { useShellConfig } from '../../contexts/ShellConfigContext';
// Import types
import { Frame, AppAssignment, ShellPreferencesRequest, AppDefinition } from 'shared';

interface PreferencesDialogProps {
    open: boolean;
    onClose: () => void;
}

// Define type for Layout Template from API
interface LayoutInfoResponse {
    id: string;
    name: string;
    description: string;
    window_count: number;
}
// Define type for Frame Template placeholders
interface FrameTemplate { id: string; name: string; slots: number; }

const PreferencesDialog: React.FC<PreferencesDialogProps> = ({ open, onClose }) => {
    // 1. Call the hook FIRST and assign the result to contextData
    const contextData = useShellConfig();

    // 2. Log the value received from the hook
    console.log("PreferencesDialog: Value received from useShellConfig() hook:", contextData);

    // 3. Destructure AFTER logging, including availableApps
    const { config, loading: configLoading, error: configError, fetchConfig, prefsServiceUrl, availableApps } = contextData;

    // State variables
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [editedFrames, setEditedFrames] = useState<Frame[]>([]);
    const [editingFrame, setEditingFrame] = useState<Frame | null>(null);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [layoutTemplates, setLayoutTemplates] = useState<LayoutInfoResponse[]>([]);
    const [loadingLayouts, setLoadingLayouts] = useState<boolean>(false);
    const [layoutError, setLayoutError] = useState<string | null>(null);

    // --- Full Render Log ---
    console.log(`PreferencesDialog Render =========================`);
    console.log(`  > open: ${open}`);
    console.log(`  > isEditMode: ${isEditMode}`);
    console.log(`  > isSaving: ${isSaving}`);
    console.log(`  > config loading/error: loading=${configLoading}, error=${configError}`);
    // Log the destructured config object (should contain frames)
    console.log(`  > destructured 'config' object:`, config);
    // Log the destructured availableApps directly
    console.log(`  > destructured 'availableApps' (length):`, availableApps?.length);
    console.log(`  > selectedTemplateId state:`, selectedTemplateId);
    console.log(`  > editingFrame state:`, editingFrame ? { id: editingFrame.id, name: editingFrame.name, apps: editingFrame.assignedApps } : null);
    console.log(`  > editedFrames state (length):`, editedFrames?.length);
    console.log(`==================================================`);
    // --- END LOG ---


    // useEffect to initialize local state when dialog opens or config changes
    useEffect(() => {
        console.log(`PreferencesDialog: useEffect[open, config?.frames] triggered. open=${open}`);
        // Use the config from the contextData directly here if needed, or the destructured one
        if (open && config?.frames) {
            console.log("PreferencesDialog: Initializing state from config.frames");
            const sortedFrames = [...config.frames]
                .sort((a, b) => a.order - b.order)
                // Deep copy assignedApps to prevent mutation issues
                .map(f => ({ ...f, assignedApps: [...(f.assignedApps || [])].map(app => ({ ...app })) }));
            setEditedFrames(sortedFrames);
            setSaveError(null);
            setSuccessMessage(null);
            // Reset edit mode state only when opening
            if (!isEditMode) { // Avoid resetting if already editing
                setIsEditMode(false);
                setEditingFrame(null);
                setSelectedTemplateId('');
            }
            console.log("PreferencesDialog: State initialized.");
        } else if (!open) {
            console.log("PreferencesDialog: Dialog closed.");
        }
        // Only depend on config?.frames here, as availableApps changing shouldn't reset the frames editing state
    }, [open, config?.frames]); // Rerun if dialog opens or frames data changes

    // useEffect to fetch layout templates when dialog opens
    useEffect(() => {
        console.log(`PreferencesDialog: useEffect[open] triggered for layout templates. open=${open}, layoutTemplates.length=${layoutTemplates.length}`);
        if (open) {
            fetchLayoutTemplates();
        }
    }, [open, prefsServiceUrl]); // Depend on open state and prefsServiceUrl

    // Function to fetch layout templates from API
    const fetchLayoutTemplates = async () => {
        console.log("PreferencesDialog: fetchLayoutTemplates called.");
        if (!prefsServiceUrl) {
            console.error("PreferencesDialog: Cannot fetch layouts - prefsServiceUrl is not configured!");
            setLayoutError("Layout service URL is not configured.");
            return;
        }
        setLoadingLayouts(true);
        setLayoutError(null);
        try {
            const response = await axios.get<LayoutInfoResponse[]>(`${prefsServiceUrl}/api/v1/shell/layouts`);
            console.log("PreferencesDialog: Layout templates fetched:", response.data);
            setLayoutTemplates(response.data);
        } catch (err: any) {
            setLayoutError(err.response?.data?.detail || err.message || 'Failed to load layout templates.');
            console.error("PreferencesDialog: Error fetching layout templates:", err);
        } finally {
            setLoadingLayouts(false);
        }
    };
    // --- Callback Handlers with Logging ---
    const handleMoveFrame = useCallback((index: number, direction: 'up' | 'down') => {
        console.log(`PreferencesDialog: handleMoveFrame called. index=${index}, direction=${direction}`);
        setEditedFrames(currentFrames => {
            const newFrames = [...currentFrames];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newFrames.length) {
                console.log("PreferencesDialog: Move out of bounds, returning current frames.");
                return currentFrames;
            }
            [newFrames[index], newFrames[targetIndex]] = [newFrames[targetIndex], newFrames[index]];
            const reorderedFrames = newFrames.map((frame, idx) => ({ ...frame, order: idx }));
            console.log("PreferencesDialog: Frames reordered locally:", reorderedFrames);
            return reorderedFrames;
        });
        setSuccessMessage(null); setSaveError(null); // Clear feedback on edit
    }, []);

    const handleAddNewFrame = () => {
        console.log("PreferencesDialog: handleAddNewFrame called.");
        const newFrame: Frame = { id: `new-${Date.now()}`, name: 'New Tab', order: editedFrames.length, assignedApps: [] };
        console.log("PreferencesDialog: Setting editingFrame for new tab:", newFrame);
        setEditingFrame(newFrame);
        setSelectedTemplateId(''); // Reset template for new frame
        setIsEditMode(true);
        setSuccessMessage(null); setSaveError(null);
    };

    const handleEditFrame = (frameToEdit: Frame) => {
        console.log("PreferencesDialog: handleEditFrame called for frame:", frameToEdit);
        // Find template based on window count matching assigned apps
        const template = layoutTemplates.find(t => t.window_count === frameToEdit.assignedApps.length);
        const initialTemplateId = template ? template.id : '';
        console.log(`PreferencesDialog: Initial template based on slots (${frameToEdit.assignedApps.length}): ${initialTemplateId}`);
        setSelectedTemplateId(initialTemplateId);
        // Deep copy assignedApps
        const frameCopy = { ...frameToEdit, assignedApps: frameToEdit.assignedApps.map(app => ({ ...app })) };
        setEditingFrame(frameCopy);
        setIsEditMode(true);
        setSuccessMessage(null); setSaveError(null);
    };

    const handleCancelEdit = () => {
        console.log("PreferencesDialog: handleCancelEdit called.");
        setIsEditMode(false);
        setEditingFrame(null);
        setSelectedTemplateId('');
    };

    const handleDeleteFrame = (frameIdToDelete: string) => {
        console.log(`PreferencesDialog: handleDeleteFrame called for ID: ${frameIdToDelete}`);
        if (window.confirm(`Are you sure you want to delete tab ${frameIdToDelete}? This takes effect after clicking 'Save All Preferences'.`)) {
            console.log(`PreferencesDialog: Deleting frame ${frameIdToDelete} locally.`);
            setEditedFrames(currentFrames => {
                const updatedFrames = currentFrames.filter(f => f.id !== frameIdToDelete).map((frame, idx) => ({ ...frame, order: idx }));
                console.log("PreferencesDialog: Frames after local deletion:", updatedFrames);
                return updatedFrames;
            });
            setSuccessMessage(null); setSaveError(null);
        } else {
            console.log("PreferencesDialog: Frame deletion cancelled by user.");
        }
    };

    const handleTemplateChange = (event: SelectChangeEvent<string>) => {
        const templateId = event.target.value;
        console.log(`PreferencesDialog: handleTemplateChange called. New templateId: ${templateId}`);
        setSelectedTemplateId(templateId); // Update template ID state first

        // Update editingFrame based on the *new* templateId
        const template = layoutTemplates.find(t => t.id === templateId);
        const numberOfSlots = template ? template.window_count : 0;
        console.log(`PreferencesDialog: Number of slots for template ${templateId}: ${numberOfSlots}`);
        
        if (editingFrame) {
            const currentApps = editingFrame.assignedApps || []; // Ensure currentApps is an array
            // Create new app assignments array based on the new slot count
            const newAssignedApps: AppAssignment[] = Array(numberOfSlots).fill(null).map((_, index) =>
                // Keep existing app if slot still exists, otherwise create empty assignment
                currentApps[index] ? { ...currentApps[index], windowId: index + 1 } : { appId: '', windowId: index + 1 }
            );
            console.log("PreferencesDialog: Updating editingFrame's assignedApps:", newAssignedApps);
            // Update the editingFrame state with the new assignedApps array
            setEditingFrame(prev => prev ? { ...prev, assignedApps: newAssignedApps } : null);
        } else {
            console.log("PreferencesDialog: editingFrame is null, cannot update assignedApps.");
        }
    };

    const handleAppAssignmentChange = (slotIndex: number, event: SelectChangeEvent<string>) => {
        const appId = event.target.value;
        console.log(`PreferencesDialog: handleAppAssignmentChange called. slotIndex=${slotIndex}, appId=${appId}`);
        if (editingFrame) {
            // Create a new array for assignedApps to ensure state update
            const updatedApps = [...editingFrame.assignedApps];
            if (slotIndex >= 0 && slotIndex < updatedApps.length) {
                const windowId = slotIndex + 1; // 1-based windowId
                updatedApps[slotIndex] = { appId: appId, windowId: windowId };
                console.log("PreferencesDialog: Updating assignedApps in editingFrame state:", updatedApps);
                setEditingFrame(prev => prev ? { ...prev, assignedApps: updatedApps } : null);
            } else {
                console.log(`PreferencesDialog: Invalid slotIndex ${slotIndex} for assignedApps length ${updatedApps.length}`);
            }
        } else {
            console.log("PreferencesDialog: editingFrame is null, cannot update app assignment.");
        }
    };

    const handleSaveEdit = () => {
        console.log("PreferencesDialog: handleSaveEdit called.");
        if (!editingFrame || !editingFrame.name.trim()) {
            console.log("PreferencesDialog: SaveEdit failed - Tab Name required.");
            setSaveError("Tab Name required.");
            return;
        }
        console.log("PreferencesDialog: Applying local edits for frame:", editingFrame);
        setSaveError(null);
        setEditedFrames(currentFrames => {
            const index = currentFrames.findIndex(f => f.id === editingFrame.id);
            const newFrames = [...currentFrames];
            // Ensure deep copy of assignedApps when saving locally
            const frameToSave = { ...editingFrame, assignedApps: editingFrame.assignedApps.map(app => ({ ...app })) };
            if (index !== -1) {
                console.log(`PreferencesDialog: Updating existing frame at index ${index}.`);
                newFrames[index] = frameToSave;
            } else {
                console.log("PreferencesDialog: Adding new frame.");
                newFrames.push(frameToSave);
            }
            // Re-calculate order after adding/updating
            const finalFrames = newFrames.map((frame, idx) => ({ ...frame, order: idx }));
            console.log("PreferencesDialog: editedFrames state updated locally:", finalFrames);
            return finalFrames;
        });
        handleCancelEdit(); // Exit edit mode
    };

    const handleSave = async () => {
        console.log("PreferencesDialog: handleSave called (Save All Preferences).");
        setIsSaving(true);
        setSaveError(null);
        setSuccessMessage(null);
        try {
            // Re-calculate order just before saving to be absolutely sure
            const framesToSave = editedFrames.map((frame, idx) => ({ ...frame, order: idx }));
            const payload: ShellPreferencesRequest = { frames: framesToSave };

            if (!prefsServiceUrl) {
                console.error("PreferencesDialog: Prefs Service URL is not configured in context!");
                throw new Error("Preferences Service URL is not configured.");
            }
            const saveUrl = `${prefsServiceUrl}/api/v1/shell/preferences`;

            console.log(`PreferencesDialog: Saving preferences via PUT to: ${saveUrl}`);
            console.log("PreferencesDialog: Payload:", JSON.stringify(payload, null, 2));

            const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
            const response = await axios.put<{ message: string }>(saveUrl, payload, { headers });

            console.log("PreferencesDialog: Save response:", response.data);
            setSuccessMessage(response.data.message || 'Preferences saved successfully!');
            await fetchConfig(); // Refresh main config context
            console.log("PreferencesDialog: fetchConfig called after save.");
            setTimeout(() => {
                if (open) { // Check if dialog is still meant to be open before closing
                    console.log("PreferencesDialog: Closing dialog after successful save.");
                    onClose();
                } else {
                    console.log("PreferencesDialog: Dialog was closed before save timeout completed.");
                }
            }, 1500); // Close after delay
        } catch (err: any) {
            const errorDetail = err.response?.data?.detail || err.message || 'Failed to save preferences.';
            console.error("PreferencesDialog: Error saving preferences:", err.response?.data || err);
            setSaveError(errorDetail);
        } finally {
            console.log("PreferencesDialog: Setting isSaving to false.");
            setIsSaving(false);
        }
    };

    // Utility to get slot count based on current state
    const getNumberOfSlots = useCallback((): number => {
        console.log("PreferencesDialog: getNumberOfSlots called.");
        if (!editingFrame) {
            console.log("  > getNumberOfSlots: No editingFrame, returning 0");
            return 0;
        }
        // Prioritize selected template
        if (selectedTemplateId) {
            const template = frameTemplates.find(t => t.id === selectedTemplateId);
            if (template) {
                console.log(`  > getNumberOfSlots: Based on old static template for selectedTemplateId '${selectedTemplateId}', returning ${template.slots} slots.`);
                return template.slots;
            }
            
            // Now try finding the template in the dynamic templates from API
            const apiTemplate = layoutTemplates.find(t => t.id === selectedTemplateId);
            if (apiTemplate) {
                const slots = apiTemplate.window_count;
                console.log(`  > getNumberOfSlots: Based on API template for selectedTemplateId '${selectedTemplateId}', returning ${slots} slots.`);
                return slots;
            }
            
            console.log(`  > getNumberOfSlots: Template '${selectedTemplateId}' not found in either source, returning 0 slots.`);
            return 0;
        }
        // If no template selected but we are editing an existing frame, use its current app count
        if (!editingFrame.id.startsWith('new-') && editingFrame.assignedApps) {
            const slots = editingFrame.assignedApps.length;
            console.log(`  > getNumberOfSlots: Based on existing editingFrame.assignedApps length, returning ${slots} slots.`); 
            return slots;
        }
        // Default for new frame with no template selected yet
        console.log("  > getNumberOfSlots: Defaulting to 0 (new frame or no template/apps).");
        return 0;
        // Depend on the state variables it uses
    }, [editingFrame, selectedTemplateId]);
    
    // Calculate number of slots based on current state for rendering
    const numberOfSlots = getNumberOfSlots();
    console.log(`PreferencesDialog Render - Calculated numberOfSlots: ${numberOfSlots}`);


    // --- JSX Rendering ---
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" disableRestoreFocus>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Shell Preferences
                <IconButton onClick={onClose} aria-label="close" disabled={isSaving}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {/* Config Loading/Error State */}
                {configLoading && <CircularProgress />}
                {/* Check destructured configLoading/configError */}
                {!configLoading && configError && !config && <Alert severity="error" sx={{ mb: 2 }}>Could not load initial configuration: {configError}</Alert>}

                {/* Save Operation Feedback */}
                {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}
                {saveError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>{saveError}</Alert>}

                {/* Render main content only if config was loaded or fetch attempted */}
                {/* Use destructured config here */}
                {!configLoading && config && (
                    <Box>
                        {/* --- Edit/Create View --- */}
                        {isEditMode && editingFrame ? (
                            <Box> {/* Single Parent for Edit View */}
                                <Typography variant="h6" gutterBottom>
                                    {editingFrame.id.startsWith('new-') ? 'Create New Tab' : `Edit Tab: ${editingFrame.name}`}
                                </Typography>
                                <TextField
                                    label="Tab Name"
                                    value={editingFrame.name}
                                    onChange={(e) => setEditingFrame(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    fullWidth margin="normal" required autoFocus
                                    error={!editingFrame?.name?.trim()}
                                    helperText={!editingFrame?.name?.trim() ? "Tab name is required." : ""}
                                    disabled={isSaving}
                                />
                                <FormControl fullWidth margin="normal">
                                    <InputLabel id="frame-layout-label">Frame Layout Template</InputLabel>
                                    <Select
                                        labelId="frame-layout-label"
                                        value={selectedTemplateId}
                                        label="Frame Layout Template"
                                        onChange={handleTemplateChange}
                                        disabled={isSaving || loadingLayouts}
                                    >
                                        <MenuItem value=""><em>Select a Layout...</em></MenuItem>
                                        {loadingLayouts && (
                                            <MenuItem disabled><CircularProgress size={20} /> Loading layouts...</MenuItem>
                                        )}
                                        {layoutError && (
                                            <MenuItem disabled sx={{ color: 'error.main' }}><em>Error: {layoutError}</em></MenuItem>
                                        )}
                                        {layoutTemplates.map(layout => (
                                            <MenuItem key={layout.id} value={layout.id}>
                                                {layout.name} ({layout.window_count} app slot{layout.window_count !== 1 ? 's' : ''}) - {layout.description}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* App Assignment Dropdowns */}
                                {numberOfSlots > 0 && (
                                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Assign Applications to Slots:</Typography>
                                )}

                                {/* Log before outer map */}
                                {(() => {
                                    console.log(`PreferencesDialog Render: About to map ${numberOfSlots} slots.`);
                                    return null;
                                })()}

                                {Array.from({ length: numberOfSlots }).map((_, index) => {
                                    // Log inside outer map
                                    console.log(`PreferencesDialog Render: Rendering controls for Slot ${index + 1}`);
                                    return (
                                        <Box key={`slot-${index}`} sx={{ display: 'flex', gap: 2, mb: 1.5, alignItems: 'center' }}>
                                            <Typography sx={{ width: '60px', textAlign: 'right', pr: 1, color: 'text.secondary' }}>Slot {index + 1}:</Typography>
                                            <FormControl fullWidth margin="none" size="small">
                                                <InputLabel id={`app-select-label-${index}`}>Select App</InputLabel>
                                                <Select
                                                    labelId={`app-select-label-${index}`}
                                                    value={editingFrame?.assignedApps?.[index]?.appId || ''}
                                                    label="Select App"
                                                    onChange={(e) => handleAppAssignmentChange(index, e)}
                                                    disabled={isSaving}
                                                >
                                                    <MenuItem value=""><em>-- Empty Slot --</em></MenuItem>
                                                    {/* --- CORRECTED: Use destructured availableApps --- */}
                                                    {availableApps?.map((app: AppDefinition) => {
                                                        console.log(`PreferencesDialog: Rendering MenuItem for app: ${app.id} - ${app.name}`);
                                                        return (
                                                            <MenuItem key={app.id} value={app.id}>{app.name} ({app.id})</MenuItem>
                                                        );
                                                    })}
                                                    {/* --- END CORRECTION --- */}
                                                </Select>
                                            </FormControl>
                                        </Box>
                                    );
                                })}
                                {/* --- END App Assignment --- */}


                                {/* Edit Actions */}
                                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                    <Button onClick={handleCancelEdit} disabled={isSaving}>Cancel Edit</Button>
                                    <Button variant="contained" onClick={handleSaveEdit} disabled={isSaving || !editingFrame?.name?.trim()}>Apply Changes Locally</Button>
                                </Box>
                                <Divider sx={{ my: 3 }} />
                            </Box> // End Edit Form Box
                        ) : (
                            /* --- List View --- */
                            <Box> {/* Single Parent for List View */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>Manage Tabs</Typography>
                                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddNewFrame} disabled={isSaving || isEditMode}>
                                        Add New Tab
                                    </Button>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Add, remove, or reorder tabs. Changes only persist after clicking "Save All Preferences".
                                </Typography>
                                {/* List of Editable Frames */}
                                <List>
                                    {editedFrames?.map((frame, index) => (
                                        <ListItem
                                            key={frame.id || `frame-${index}`} // Use index as fallback key if needed
                                            secondaryAction={
                                                <>
                                                    <IconButton aria-label={`Move ${frame.name} up`} size="small" onClick={() => handleMoveFrame(index, 'up')} disabled={index === 0 || isSaving || isEditMode}><ArrowUpwardIcon fontSize="inherit" /></IconButton>
                                                    <IconButton aria-label={`Move ${frame.name} down`} size="small" onClick={() => handleMoveFrame(index, 'down')} disabled={index === editedFrames.length - 1 || isSaving || isEditMode}><ArrowDownwardIcon fontSize="inherit" /></IconButton>
                                                    <IconButton aria-label={`Edit ${frame.name}`} size="small" onClick={() => handleEditFrame(frame)} disabled={isSaving || isEditMode}><SettingsIcon fontSize="inherit" /></IconButton>
                                                    <IconButton aria-label={`Delete ${frame.name}`} size="small" onClick={() => handleDeleteFrame(frame.id)} disabled={isSaving || isEditMode}><DeleteIcon fontSize="inherit" /></IconButton>
                                                </>
                                            }
                                            sx={{ borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 }, pr: '130px' /* Adjust padding for actions */ }}
                                        >
                                            <ListItemIcon sx={{ minWidth: '30px', cursor: 'grab', color: 'action.disabled' }} aria-hidden="true"><DragHandleIcon fontSize='small' /></ListItemIcon>
                                            <ListItemText primary={frame.name || '(Unnamed Tab)'} secondary={`ID: ${frame.id || '(unsaved)'}`} />
                                        </ListItem>
                                    ))}
                                </List>
                                {/* Message if no frames */}
                                {editedFrames?.length === 0 && !isEditMode && (
                                    <Typography sx={{ mt: 3, p: 2, fontStyle: 'italic', textAlign: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                                        No tabs configured. Click "Add New Tab" to get started.
                                    </Typography>
                                )}
                            </Box> // End List View Box
                        )}
                    </Box> // End Conditional Content Box
                )}
            </DialogContent>
            {/* Main Dialog Actions */}
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    color="primary"
                    // Disable save if editing, or config still loading, or save in progress
                    disabled={isSaving || isEditMode || configLoading || !!configError}
                >
                    {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Save All Preferences'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PreferencesDialog;