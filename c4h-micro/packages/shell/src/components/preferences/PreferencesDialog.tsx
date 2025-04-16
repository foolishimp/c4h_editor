import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // <-- Make sure axios is imported
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    CircularProgress,
    Alert,
    Divider,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    SelectChangeEvent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete'; // <-- Ensure DeleteIcon is imported
import SettingsIcon from '@mui/icons-material/Settings';

import { useShellConfig } from '../../contexts/ShellConfigContext';
// Ensure all necessary types are imported from shared
import { Frame, AppAssignment, ShellPreferencesRequest, AppDefinition } from 'shared';

interface PreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

// Define type for Frame Template placeholders
interface FrameTemplate {
    id: string;
    name: string;
    slots: number;
}

// Define the Preferences Service URL (adjust if needed or use env var)
const PREFERENCES_SERVICE_BASE_URL = 'http://localhost:8001';

const PreferencesDialog: React.FC<PreferencesDialogProps> = ({ open, onClose }) => {
  // Get config and fetch function from context
  const { config, loading: configLoading, error: configError, fetchConfig } = useShellConfig();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Local state to manage the list of frames being edited
  const [editedFrames, setEditedFrames] = useState<Frame[]>([]);

  // State for managing the edit/create view
  const [editingFrame, setEditingFrame] = useState<Frame | null>(null); // Track the frame being edited/created
  const [isEditMode, setIsEditMode] = useState<boolean>(false); // Toggle between list and edit view
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(''); // State for selected template

  // --- Placeholder Data ---
  // TODO: Replace with actual data source (API call or hardcoded)
  const frameTemplates: FrameTemplate[] = [
      { id: 'template-1', name: 'Single App Layout', slots: 1 },
      { id: 'template-2', name: 'Two App Layout', slots: 2 },
      { id: 'template-3', name: 'Three App Layout', slots: 3 },
  ];

  // Initialize local state when the dialog opens or config changes
  useEffect(() => {
    if (open && config?.frames) {
      console.log("PreferencesDialog: Initializing local state from config.frames");
      const sortedFrames = [...config.frames]
                             .sort((a, b) => a.order - b.order)
                             .map(f => ({ ...f, assignedApps: [...(f.assignedApps || [])] }));
      setEditedFrames(sortedFrames);
      setSaveError(null);
      setSuccessMessage(null);
      setIsEditMode(false);
      setEditingFrame(null);
      setSelectedTemplateId('');
    }
  }, [open, config?.frames]);

  const handleMoveFrame = useCallback((index: number, direction: 'up' | 'down') => {
    setEditedFrames(currentFrames => {
      const newFrames = [...currentFrames];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFrames.length) return currentFrames;
      [newFrames[index], newFrames[targetIndex]] = [newFrames[targetIndex], newFrames[index]];
      return newFrames.map((frame, idx) => ({ ...frame, order: idx }));
    });
    setSuccessMessage(null);
    setSaveError(null);
  }, []);

  // --- CORRECTED handleSave ---
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    console.log("Attempting to save preferences...");
    try {
        // Ensure editedFrames order is up-to-date before saving
        const framesToSave = editedFrames.map((frame, idx) => ({ ...frame, order: idx }));
        const payload: ShellPreferencesRequest = { frames: framesToSave };
        const saveUrl = `${PREFERENCES_SERVICE_BASE_URL}/api/v1/shell/preferences`;

        console.log(`Saving preferences via PUT to: ${saveUrl}`);
        console.log("Payload:", JSON.stringify(payload, null, 2));

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // 'X-User-ID': 'test-user-1' // Example if needed
        };
        const response = await axios.put<{ message: string }>(saveUrl, payload, { headers });

        console.log("Save response:", response.data);
        setSuccessMessage(response.data.message || 'Preferences saved successfully!');
        await fetchConfig();

        setTimeout(() => {
             // Check if still mounted and open before closing
             // (For simplicity, assuming component is still mounted if 'open' prop is true)
             if (open) {
               onClose();
             }
        }, 1500);
    } catch (err: any) {
        const errorDetail = err.response?.data?.detail || err.message || 'Failed to save preferences.';
        setSaveError(errorDetail);
        console.error("Error saving preferences:", err.response?.data || err);
    } finally {
        setIsSaving(false);
    }
  };
  // --- END CORRECTED handleSave ---

  const handleAddNewFrame = () => {
      console.log("Add New Frame clicked");
      const newFrame: Frame = {
          id: `new-${Date.now()}`,
          name: 'New Tab',
          order: editedFrames.length,
          assignedApps: [],
      };
      setEditingFrame(newFrame);
      setSelectedTemplateId('');
      setIsEditMode(true);
      setSuccessMessage(null);
      setSaveError(null);
  };

  const handleEditFrame = (frameToEdit: Frame) => {
      console.log("Editing frame:", frameToEdit.id);
      const template = frameTemplates.find(t => t.slots === frameToEdit.assignedApps.length);
      setSelectedTemplateId(template ? template.id : '');
      // Ensure deep copy of nested assignedApps array
      setEditingFrame({
          ...frameToEdit,
          assignedApps: frameToEdit.assignedApps.map(app => ({ ...app }))
      });
      setIsEditMode(true);
      setSuccessMessage(null);
      setSaveError(null);
  };

  const handleCancelEdit = () => {
      setIsEditMode(false);
      setEditingFrame(null);
      setSelectedTemplateId('');
  };

  // --- Delete Handler Implementation ---
  const handleDeleteFrame = (frameIdToDelete: string) => {
      // Simple confirmation
      if (window.confirm(`Are you sure you want to delete this tab (ID: ${frameIdToDelete})? This action only takes effect after clicking 'Save All Preferences'.`)) {
          console.log("Deleting frame locally:", frameIdToDelete);
          setEditedFrames(currentFrames =>
              currentFrames
                  .filter(f => f.id !== frameIdToDelete)
                  .map((frame, idx) => ({ ...frame, order: idx })) // Recalculate order
          );
          setSuccessMessage(null); // Clear messages on edit
          setSaveError(null);
      }
  };
  // --- End Delete Handler ---

  const handleTemplateChange = (event: SelectChangeEvent<string>) => {
      const templateId = event.target.value;
      setSelectedTemplateId(templateId);
      const template = frameTemplates.find(t => t.id === templateId);
      const numberOfSlots = template ? template.slots : 0;

      if (editingFrame) {
          const newAssignedApps: AppAssignment[] = Array(numberOfSlots).fill(null).map(() => ({ appId: '' }));
          setEditingFrame(prev => prev ? { ...prev, assignedApps: newAssignedApps } : null);
      }
  };

  const handleAppAssignmentChange = (slotIndex: number, event: SelectChangeEvent<string>) => {
      const appId = event.target.value;
      if (editingFrame) {
          const updatedApps = [...editingFrame.assignedApps];
          if (slotIndex < updatedApps.length) {
              updatedApps[slotIndex] = { appId: appId };
              setEditingFrame(prev => prev ? { ...prev, assignedApps: updatedApps } : null);
          } else {
               console.warn(`Attempted to assign app to non-existent slot index: ${slotIndex}`);
          }
      }
  };

  const handleSaveEdit = () => {
      if (!editingFrame) return;
      if (!editingFrame.name.trim()) {
          setSaveError("Tab Name cannot be empty.");
          return;
      }
       setSaveError(null);

      setEditedFrames(currentFrames => {
          const existingIndex = currentFrames.findIndex(f => f.id === editingFrame.id);
          let newFrames = [...currentFrames];
          // Ensure deep copy when saving edited frame
          const frameToSave = { ...editingFrame, assignedApps: editingFrame.assignedApps.map(app => ({...app})) };
          if (existingIndex !== -1) {
              newFrames[existingIndex] = frameToSave;
               console.log("Applied changes to existing frame:", editingFrame.id);
          } else {
              newFrames.push(frameToSave);
               console.log("Applied new frame:", editingFrame.id);
          }
          return newFrames.map((frame, idx) => ({ ...frame, order: idx }));
      });
      handleCancelEdit();
  };

  // --- REMOVED DUPLICATE handleDeleteFrame definition ---


  const getNumberOfSlots = (): number => {
      if (editingFrame) {
          const template = frameTemplates.find(t => t.id === selectedTemplateId);
          if (template) {
              return template.slots;
          }
          if (!selectedTemplateId && !editingFrame.id.startsWith('new-')) {
             return editingFrame.assignedApps.length;
          }
      }
      return 0;
  };
  const numberOfSlots = getNumberOfSlots();


  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Shell Preferences
        <IconButton onClick={onClose} aria-label="close"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {configLoading && <CircularProgress />}
        {!configLoading && configError && <Alert severity="warning" sx={{ mb: 2 }}>Could not load initial config: {configError}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

        {!configLoading && !configError && config && (
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
                     fullWidth
                     margin="normal"
                     required
                     error={!editingFrame?.name?.trim()}
                     helperText={!editingFrame?.name?.trim() ? "Tab name is required." : ""}
                 />
                 <FormControl fullWidth margin="normal">
                     <InputLabel id="frame-layout-label">Frame Layout</InputLabel>
                     <Select
                        labelId="frame-layout-label"
                        value={selectedTemplateId}
                        label="Frame Layout"
                        onChange={handleTemplateChange}
                     >
                         <MenuItem value=""><em>Select a Layout...</em></MenuItem>
                         {frameTemplates.map(template => (
                             <MenuItem key={template.id} value={template.id}>{template.name} ({template.slots} app{template.slots !== 1 ? 's' : ''})</MenuItem>
                         ))}
                     </Select>
                 </FormControl>
                 {numberOfSlots > 0 && (
                     <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Assign Applications:</Typography>
                 )}
                 {Array.from({ length: numberOfSlots }).map((_, index) => (
                     <Box key={`slot-${index}`} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                         <Typography sx={{ width: '50px', textAlign: 'right'}}>F{index + 1}:</Typography>
                         <FormControl fullWidth margin="none">
                            <InputLabel id={`app-select-label-${index}`}>Select App</InputLabel>
                             <Select
                                labelId={`app-select-label-${index}`}
                                value={editingFrame.assignedApps && editingFrame.assignedApps[index] ? editingFrame.assignedApps[index].appId : ''}
                                label="Select App"
                                onChange={(e) => handleAppAssignmentChange(index, e)}
                             >
                                 <MenuItem value=""><em>-- None --</em></MenuItem>
                                 {config?.availableApps?.map((app: AppDefinition) => (
                                     <MenuItem key={app.id} value={app.id}>{app.name} ({app.id})</MenuItem>
                                 ))}
                             </Select>
                         </FormControl>
                     </Box>
                 ))}
                 <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={handleCancelEdit} disabled={isSaving}>Cancel Edit</Button>
                    <Button variant="contained" onClick={handleSaveEdit} disabled={isSaving || !editingFrame?.name?.trim()}>Apply Changes</Button>
                 </Box>
                 <Divider sx={{ my: 3 }} />
              </Box>
            ) : (
              /* --- List View --- */
              <Box>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1}}>
                     <Typography variant="h6" gutterBottom sx={{mb:0}}>Manage Tabs</Typography>
                     <Button
                         variant="outlined"
                         startIcon={<AddIcon />}
                         onClick={handleAddNewFrame}
                         disabled={isSaving || isEditMode}
                     >
                         Create New Tab
                     </Button>
                 </Box>
                 <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                    Add, remove, or reorder the tabs visible in the main sidebar.
                 </Typography>
                 <List>
                    {editedFrames?.map((frame, index) => (
                        <ListItem
                            key={frame.id || `frame-${index}`}
                            secondaryAction={
                                <>
                                    <IconButton
                                        aria-label={`Move ${frame.name} up`}
                                        size="small"
                                        onClick={() => handleMoveFrame(index, 'up')}
                                        disabled={index === 0 || isSaving || isEditMode}
                                    ><ArrowUpwardIcon fontSize="inherit" /></IconButton>
                                    <IconButton
                                        aria-label={`Move ${frame.name} down`}
                                        size="small"
                                        onClick={() => handleMoveFrame(index, 'down')}
                                        disabled={index === editedFrames.length - 1 || isSaving || isEditMode}
                                    ><ArrowDownwardIcon fontSize="inherit" /></IconButton>
                                    <IconButton
                                        aria-label={`Edit ${frame.name}`}
                                        size="small"
                                        onClick={() => handleEditFrame(frame)} // Connect edit handler
                                        disabled={isSaving || isEditMode}
                                    ><SettingsIcon fontSize="inherit" /></IconButton>
                                    {/* Delete Button Connected */}
                                    <IconButton
                                        aria-label={`Delete ${frame.name}`}
                                        size="small"
                                        onClick={() => handleDeleteFrame(frame.id)} // Connect delete handler
                                        disabled={isSaving || isEditMode}
                                    ><DeleteIcon fontSize="inherit" /></IconButton>
                                </>
                            }
                            sx={{ borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}
                        >
                            <ListItemIcon sx={{ minWidth: '30px', cursor: 'grab' }} aria-hidden="true"><DragHandleIcon fontSize='small' /></ListItemIcon>
                            <ListItemText primary={frame.name || '(Unnamed Frame)'} secondary={`ID: ${frame.id || '(new)'}`} />
                        </ListItem>
                    ))}
                 </List>
                 {editedFrames?.length === 0 && !isEditMode && (
                    <Typography sx={{mt: 2, fontStyle: 'italic', textAlign: 'center'}}>
                        No tabs configured. Click "Create New Tab" to get started.
                    </Typography>
                 )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaving || isEditMode || configLoading || !!configError}
        >
          {isSaving ? <CircularProgress size={24} color="inherit"/> : 'Save All Preferences'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreferencesDialog;