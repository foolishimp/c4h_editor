import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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

import { useShellConfig } from '../../contexts/ShellConfigContext';
// Import types from shared - Ensure shared package is built correctly after export changes
import {
    Frame, AppAssignment, ShellPreferencesRequest, AppDefinition, LayoutInfoResponse
} from 'shared'; // Import LayoutInfoResponse

interface PreferencesDialogProps {
    open: boolean;
    onClose: () => void;
}

// REMOVED FrameTemplate interface

const PreferencesDialog: React.FC<PreferencesDialogProps> = ({ open, onClose }) => {
    const { config, loading: configLoading, error: configError, fetchConfig, prefsServiceUrl, availableApps } = useShellConfig();

    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [editedFrames, setEditedFrames] = useState<Frame[]>([]); // Use Frame type
    const [editingFrame, setEditingFrame] = useState<Frame | null>(null); // Use Frame type
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [layoutTemplates, setLayoutTemplates] = useState<LayoutInfoResponse[]>([]); // Use LayoutInfoResponse type
    const [loadingLayouts, setLoadingLayouts] = useState<boolean>(false);
    const [layoutError, setLayoutError] = useState<string | null>(null);
    const [selectedLayoutId, setSelectedLayoutId] = useState<string>(''); // Store the selected layout ID

    // Fetch layout templates
    const fetchLayoutTemplates = useCallback(async () => {
        if (!prefsServiceUrl) {
            setLayoutError("Layout service URL is not configured.");
            return;
        }
        setLoadingLayouts(true);
        setLayoutError(null);
        try {
            const response = await axios.get<LayoutInfoResponse[]>(`${prefsServiceUrl}/api/v1/shell/layouts`);
            setLayoutTemplates(response.data);
        } catch (err: any) {
            setLayoutError(err.response?.data?.detail || err.message || 'Failed to load layout templates.');
        } finally {
            setLoadingLayouts(false);
        }
    }, [prefsServiceUrl]);

    // Initialize state
    useEffect(() => {
        if (open && config?.frames) {
            const sortedFrames = [...config.frames]
                .sort((a, b) => a.order - b.order)
                .map(f => ({ ...f, assignedApps: [...(f.assignedApps || [])].map(app => ({ ...app })) }));
            setEditedFrames(sortedFrames);
            setSaveError(null);
            setSuccessMessage(null);
            if (!isEditMode) {
                setIsEditMode(false);
                setEditingFrame(null);
                setSelectedLayoutId('');
            }
        } else if (!open) {
            setIsEditMode(false);
            setEditingFrame(null);
            setSelectedLayoutId('');
        }
    }, [open, config?.frames]); // isEditMode removed from deps

    // Fetch layouts when dialog opens
    useEffect(() => {
        if (open && layoutTemplates.length === 0) {
            fetchLayoutTemplates();
        }
    }, [open, fetchLayoutTemplates, layoutTemplates.length]);

    // --- Callback Handlers ---
    const handleMoveFrame = useCallback((index: number, direction: 'up' | 'down') => {
        setEditedFrames(currentFrames => {
            const newFrames = [...currentFrames];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newFrames.length) return currentFrames;
            [newFrames[index], newFrames[targetIndex]] = [newFrames[targetIndex], newFrames[index]];
            return newFrames.map((frame, idx) => ({ ...frame, order: idx }));
        });
        setSuccessMessage(null); setSaveError(null);
    }, []);

    const handleAddNewFrame = () => {
        // Explicitly define type, ensuring layoutId and assignedApps exist
        const newFrame: Frame = {
            id: `new-${Date.now()}`,
            name: 'New Tab',
            order: editedFrames.length,
            layoutId: undefined, // Start with no layout
            assignedApps: [] // Start with empty apps
        };
        setEditingFrame(newFrame);
        setSelectedLayoutId('');
        setIsEditMode(true);
        setSuccessMessage(null); setSaveError(null);
    };

    const handleEditFrame = (frameToEdit: Frame) => {
        // Ensure assignedApps is an array when copying
        const frameCopy: Frame = { ...frameToEdit, assignedApps: (frameToEdit.assignedApps || []).map(app => ({ ...app })) };
        setEditingFrame(frameCopy);
        setSelectedLayoutId(frameToEdit.layoutId || ''); // Use layoutId from Frame type
        setIsEditMode(true);
        setSuccessMessage(null); setSaveError(null);
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditingFrame(null);
        setSelectedLayoutId('');
    };

    const handleDeleteFrame = (frameIdToDelete: string) => {
        if (window.confirm(`Delete tab "${editedFrames.find(f => f.id === frameIdToDelete)?.name || frameIdToDelete}"?`)) {
            setEditedFrames(currentFrames => currentFrames
                .filter(f => f.id !== frameIdToDelete)
                .map((frame, idx) => ({ ...frame, order: idx }))
            );
            setSuccessMessage(null); setSaveError(null);
        }
    };

    const handleTemplateChange = (event: SelectChangeEvent<string>) => {
        const newLayoutId = event.target.value;
        setSelectedLayoutId(newLayoutId);

        const template = layoutTemplates.find(t => t.id === newLayoutId);
        const numberOfSlots = template ? template.window_count : 0;

        if (editingFrame) {
            const currentApps = editingFrame.assignedApps || [];
            // Create new app assignments array
            const newAssignedApps: AppAssignment[] = Array(numberOfSlots).fill(null).map((_, index) => {
                const windowId = index + 1;
                const existingApp = currentApps.find(app => app.windowId === windowId);
                // Ensure AppAssignment includes windowId
                return existingApp ? { ...existingApp } : { appId: '', windowId: windowId };
            });
            // Update editingFrame state, including the layoutId
            setEditingFrame(prev => prev ? { ...prev, layoutId: newLayoutId || undefined, assignedApps: newAssignedApps } : null);
        }
    };

    const handleAppAssignmentChange = (slotIndex: number, event: SelectChangeEvent<string>) => {
        const appId = event.target.value;
        const windowId = slotIndex + 1; // Derive windowId
        if (editingFrame) {
            const updatedApps = [...(editingFrame.assignedApps || [])];
            const existingAssignmentIndex = updatedApps.findIndex(app => app.windowId === windowId);

            if (existingAssignmentIndex !== -1) {
                 // Update existing, ensuring windowId is included
                updatedApps[existingAssignmentIndex] = { ...updatedApps[existingAssignmentIndex], appId: appId, windowId: windowId };
            } else if (slotIndex < numberOfSlots) {
                // Add new assignment for this window if it doesn't exist (should only happen if array was empty)
                 updatedApps[slotIndex] = { appId: appId, windowId: windowId };
                 console.warn(`App Assignment: Added new entry for slotIndex ${slotIndex} / windowId ${windowId} as it wasn't found.`);
            } else {
                 console.error(`App Assignment: Invalid slotIndex ${slotIndex} or windowId ${windowId} for assignment.`);
                 return; // Prevent adding invalid data
            }

            setEditingFrame(prev => prev ? { ...prev, assignedApps: updatedApps } : null);
        }
    };


    const handleSaveEdit = () => {
        if (!editingFrame || !editingFrame.name.trim()) {
            setSaveError("Tab Name required.");
            return;
        }
        setSaveError(null);
        setEditedFrames(currentFrames => {
            const index = currentFrames.findIndex(f => f.id === editingFrame.id);
            const newFrames = [...currentFrames];
            // Create a copy ensuring assignedApps exists and includes windowId
            const frameToSave: Frame = {
                ...editingFrame,
                assignedApps: (editingFrame.assignedApps || []).map(app => ({
                    appId: app.appId,
                    windowId: app.windowId // Ensure windowId is present
                }))
            };
            if (index !== -1) {
                newFrames[index] = frameToSave;
            } else {
                newFrames.push(frameToSave);
            }
            return newFrames.map((frame, idx) => ({ ...frame, order: idx }));
        });
        handleCancelEdit();
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError(null);
        setSuccessMessage(null);
        try {
            const framesToSave = editedFrames.map((frame, idx) => ({
                ...frame,
                order: idx,
                // Ensure assignedApps has windowId before saving
                assignedApps: (frame.assignedApps || []).map(app => ({ appId: app.appId, windowId: app.windowId }))
            }));
            const payload: ShellPreferencesRequest = { frames: framesToSave };

            if (!prefsServiceUrl) throw new Error("Preferences Service URL is not configured.");

            const saveUrl = `${prefsServiceUrl}/api/v1/shell/preferences`;
            console.log(`Saving preferences to: ${saveUrl}`, payload);
            const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
            const response = await axios.put<{ message: string }>(saveUrl, payload, { headers });
            setSuccessMessage(response.data.message || 'Preferences saved successfully!');
            await fetchConfig(); // Refresh main config context
            setTimeout(() => { if (open) onClose(); }, 1500);
        } catch (err: any) {
            const errorDetail = err.response?.data?.detail || err.message || 'Failed to save preferences.';
            setSaveError(errorDetail);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate number of slots based on selected layout
    const getNumberOfSlots = useCallback((): number => {
        if (selectedLayoutId) {
            const template = layoutTemplates.find(t => t.id === selectedLayoutId);
            return template ? template.window_count : 0;
        }
        // If editing and no template selected, use current app count IF layoutId is not set
        if (editingFrame && !editingFrame.layoutId && editingFrame.assignedApps) {
             return editingFrame.assignedApps.length;
        }
        return 0;
    }, [selectedLayoutId, layoutTemplates, editingFrame]);

    const numberOfSlots = getNumberOfSlots();

    // --- JSX Rendering ---
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" disableRestoreFocus>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Shell Preferences
                <IconButton onClick={onClose} aria-label="close" disabled={isSaving}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {/* Loading/Error States */}
                {configLoading && <CircularProgress />}
                {!configLoading && configError && !config && <Alert severity="error" sx={{ mb: 2 }}>Could not load initial configuration: {configError}</Alert>}
                {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}
                {saveError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>{saveError}</Alert>}

                {!configLoading && config && (
                    <Box>
                        {/* --- Edit/Create View --- */}
                        {isEditMode && editingFrame ? (
                            <Box>
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
                                        value={selectedLayoutId}
                                        label="Frame Layout Template"
                                        onChange={handleTemplateChange}
                                        disabled={isSaving || loadingLayouts}
                                    >
                                        <MenuItem value=""><em>Select a Layout...</em></MenuItem>
                                        {loadingLayouts && <MenuItem disabled><CircularProgress size={20} /> Loading layouts...</MenuItem>}
                                        {layoutError && <MenuItem disabled sx={{ color: 'error.main' }}><em>Error: {layoutError}</em></MenuItem>}
                                        {layoutTemplates.map(layout => (
                                            <MenuItem key={layout.id} value={layout.id}>
                                                {layout.name} ({layout.window_count} slot{layout.window_count !== 1 ? 's' : ''}) - {layout.description}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* App Assignment Dropdowns */}
                                {numberOfSlots > 0 && <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Assign Applications:</Typography>}
                                {Array.from({ length: numberOfSlots }).map((_, index) => {
                                    const windowId = index + 1;
                                    // Ensure editingFrame and assignedApps exist before finding
                                    const currentAppId = editingFrame?.assignedApps?.find(app => app.windowId === windowId)?.appId || '';
                                    return (
                                        <Box key={`slot-${index}`} sx={{ display: 'flex', gap: 2, mb: 1.5, alignItems: 'center' }}>
                                            <Typography sx={{ width: '80px', textAlign: 'right', pr: 1, color: 'text.secondary' }}>Window {windowId}:</Typography>
                                            <FormControl fullWidth margin="none" size="small">
                                                <InputLabel id={`app-select-label-${index}`}>Select App</InputLabel>
                                                <Select
                                                    labelId={`app-select-label-${index}`}
                                                    value={currentAppId}
                                                    label="Select App"
                                                    onChange={(e) => handleAppAssignmentChange(index, e)}
                                                    disabled={isSaving}
                                                >
                                                    <MenuItem value=""><em>-- Empty Slot --</em></MenuItem>
                                                    {/* Ensure availableApps is checked */}
                                                    {availableApps?.map((app: AppDefinition) => (
                                                        <MenuItem key={app.id} value={app.id}>{app.name} ({app.id})</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Box>
                                    );
                                })}
                                {/* Edit Actions */}
                                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                    <Button onClick={handleCancelEdit} disabled={isSaving}>Cancel Edit</Button>
                                    <Button variant="contained" onClick={handleSaveEdit} disabled={isSaving || !editingFrame?.name?.trim()}>Apply Changes Locally</Button>
                                </Box>
                                <Divider sx={{ my: 3 }} />
                            </Box>
                        ) : (
                            /* --- List View --- */
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>Manage Tabs</Typography>
                                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddNewFrame} disabled={isSaving || isEditMode}>Add New Tab</Button>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Add, remove, or reorder tabs.</Typography>
                                <List>
                                    {editedFrames?.map((frame, index) => (
                                        <ListItem key={frame.id || `frame-${index}`} secondaryAction={
                                            <>
                                                <IconButton size="small" onClick={() => handleMoveFrame(index, 'up')} disabled={index === 0 || isSaving || isEditMode}><ArrowUpwardIcon fontSize="inherit" /></IconButton>
                                                <IconButton size="small" onClick={() => handleMoveFrame(index, 'down')} disabled={index === editedFrames.length - 1 || isSaving || isEditMode}><ArrowDownwardIcon fontSize="inherit" /></IconButton>
                                                <IconButton size="small" onClick={() => handleEditFrame(frame)} disabled={isSaving || isEditMode}><SettingsIcon fontSize="inherit" /></IconButton>
                                                <IconButton size="small" onClick={() => handleDeleteFrame(frame.id)} disabled={isSaving || isEditMode}><DeleteIcon fontSize="inherit" /></IconButton>
                                            </>
                                        } sx={{ borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 }, pr: '130px' }}>
                                            <ListItemIcon sx={{ minWidth: '30px', cursor: 'grab', color: 'action.disabled' }}><DragHandleIcon fontSize='small' /></ListItemIcon>
                                            <ListItemText primary={frame.name || '(Unnamed Tab)'} secondary={`ID: ${frame.id || '(unsaved)'}`} />
                                        </ListItem>
                                    ))}
                                </List>
                                {editedFrames?.length === 0 && !isEditMode && (
                                    <Typography sx={{ mt: 3, p: 2, fontStyle: 'italic', textAlign: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>No tabs configured.</Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary" disabled={isSaving || isEditMode || configLoading || !!configError}>
                    {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Save All Preferences'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PreferencesDialog;