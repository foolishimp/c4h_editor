import React, { useState, useEffect, useCallback } from 'react';
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
    SelectChangeEvent // <-- Added for Select onChange typing
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings'; // <-- SettingsIcon import seems correct

import { useShellConfig } from '../../contexts/ShellConfigContext';
import { Frame, AppAssignment, ShellPreferencesRequest, apiService, AppDefinition } from 'shared'; // <-- Added AppAssignment, AppDefinition

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
      { id: 'template-3', name: 'Three App Layout', slots: 3 }, // Added a 3-slot example
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
      setSelectedTemplateId(''); // Reset selected template
    }
  }, [open, config?.frames]);

  const handleMoveFrame = useCallback((index: number, direction: 'up' | 'down') => {
    // (Keep existing handleMoveFrame logic - seems correct)
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

  const handleSave = async () => {
    // (Keep existing handleSave logic - seems correct)
    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    console.log("Attempting to save preferences...");
    try {
        const framesToSave = editedFrames.map((frame, idx) => ({ ...frame, order: idx }));
        const payload: ShellPreferencesRequest = { frames: framesToSave };
        console.log("Payload:", JSON.stringify(payload, null, 2));
        const response = await apiService.saveShellPreferences(payload);
        console.log("Save response:", response);
        setSuccessMessage(response.message || 'Preferences saved successfully!');
        await fetchConfig();
        setTimeout(() => {
             if (open) {
               onClose();
             }
        }, 1500);
    } catch (err: any) {
        const errorDetail = err.response?.data?.detail || err.message || 'Failed to save preferences.';
        setSaveError(errorDetail);
        console.error("Error saving preferences:", err);
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddNewFrame = () => {
      console.log("Add New Frame clicked");
      // Create a blank frame structure to edit
      const newFrame: Frame = {
          id: `new-${Date.now()}`, // Temporary ID, replace on save if needed
          name: 'New Tab',
          order: editedFrames.length, // Will be recalculated on save
          assignedApps: [], // Start with no apps
      };
      setEditingFrame(newFrame);
      setSelectedTemplateId(''); // No template selected initially for new frame
      setIsEditMode(true);
      setSuccessMessage(null);
      setSaveError(null);
  };

  const handleEditFrame = (frameToEdit: Frame) => {
      console.log("Editing frame:", frameToEdit.id);
      // Find the corresponding template based on number of assigned apps (simple heuristic for now)
      // TODO: A better approach might be to store templateId with the frame if created from one
      const template = frameTemplates.find(t => t.slots === frameToEdit.assignedApps.length);
      setSelectedTemplateId(template ? template.id : ''); // Set selected template if found

      setEditingFrame({ ...frameToEdit, assignedApps: [...frameToEdit.assignedApps] }); // Deep copy assignedApps
      setIsEditMode(true);
      setSuccessMessage(null);
      setSaveError(null);
  };

  const handleCancelEdit = () => {
      setIsEditMode(false);
      setEditingFrame(null);
      setSelectedTemplateId(''); // Reset selected template
  };

  const handleTemplateChange = (event: SelectChangeEvent<string>) => {
      const templateId = event.target.value;
      setSelectedTemplateId(templateId);
      const template = frameTemplates.find(t => t.id === templateId);
      const numberOfSlots = template ? template.slots : 0;

      // Update editingFrame with the correct number of empty app assignments
      if (editingFrame) {
          const newAssignedApps: AppAssignment[] = Array(numberOfSlots).fill(null).map(() => ({ appId: '' })); // Create empty slots
          setEditingFrame({ ...editingFrame, assignedApps: newAssignedApps });
      }
  };

  const handleAppAssignmentChange = (slotIndex: number, event: SelectChangeEvent<string>) => {
      const appId = event.target.value;
      if (editingFrame) {
          const updatedApps = [...editingFrame.assignedApps];
          if (slotIndex < updatedApps.length) {
              updatedApps[slotIndex] = { appId: appId };
              setEditingFrame({ ...editingFrame, assignedApps: updatedApps });
          }
      }
  };

  const handleSaveEdit = () => {
      if (!editingFrame) return;

      // TODO: Add validation (e.g., ensure name is not empty, apps are assigned if needed)

      setEditedFrames(currentFrames => {
          const existingIndex = currentFrames.findIndex(f => f.id === editingFrame.id);
          let newFrames = [...currentFrames];
          if (existingIndex !== -1) {
              // Update existing frame
              newFrames[existingIndex] = { ...editingFrame };
          } else {
              // Add new frame
              newFrames.push({ ...editingFrame });
          }
          // Recalculate order after adding/updating
          return newFrames.map((frame, idx) => ({ ...frame, order: idx }));
      });

      // Exit edit mode
      handleCancelEdit();
  };

    const handleDeleteFrame = (frameIdToDelete: string) => {
        console.log("Deleting frame:", frameIdToDelete);
        // Add confirmation dialog here?
        setEditedFrames(currentFrames =>
            currentFrames
                .filter(f => f.id !== frameIdToDelete)
                .map((frame, idx) => ({ ...frame, order: idx })) // Recalculate order
        );
        setSuccessMessage(null);
        setSaveError(null);
    };


  // Determine the number of slots based on the selected template or the editing frame
  const getNumberOfSlots = (): number => {
      if (editingFrame) {
          const template = frameTemplates.find(t => t.id === selectedTemplateId);
          if (template) {
              return template.slots;
          }
          // If editing an existing frame without a template selected, use its current app count
          if (!selectedTemplateId && !editingFrame.id.startsWith('new-')) {
             return editingFrame.assignedApps.length;
          }
      }
      return 0; // Default to 0 if no template selected or not editing
  };
  const numberOfSlots = getNumberOfSlots();


  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Shell Preferences
        <IconButton onClick={onClose} aria-label="close"><CloseIcon /></IconButton>
      </DialogTitle>
      {/* **** Add Closing DialogContent tag here **** */}
      <DialogContent dividers>
        {/* Show loading/error related to fetching the initial config */}
        {configLoading && <CircularProgress />}
        {!configLoading && configError && <Alert severity="warning" sx={{ mb: 2 }}>Could not load initial config: {configError}</Alert>}

        {/* Show messages related to saving */}
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

        {/* Ensure config is loaded before rendering UI */}
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
                     onChange={(e) => setEditingFrame({ ...editingFrame, name: e.target.value })}
                     fullWidth
                     margin="normal"
                     required // Added required
                 />

                 <FormControl fullWidth margin="normal">
                     <InputLabel id="frame-layout-label">Frame Layout</InputLabel>
                     <Select
                        labelId="frame-layout-label"
                        value={selectedTemplateId}
                        label="Frame Layout"
                        onChange={handleTemplateChange}
                     >
                         <MenuItem value=""><em>Select a Layout...</em></MenuItem> {/* Added default empty option */}
                         {frameTemplates.map(template => (
                             <MenuItem key={template.id} value={template.id}>{template.name} ({template.slots} app{template.slots !== 1 ? 's' : ''})</MenuItem>
                         ))}
                     </Select>
                 </FormControl>

                 {/* App Assignment Dropdowns - Render based on selected template/frame */}
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
                                value={editingFrame.assignedApps[index]?.appId || ''} // Handle potential undefined slot
                                label="Select App"
                                onChange={(e) => handleAppAssignmentChange(index, e)}
                             >
                                 <MenuItem value=""><em>-- None --</em></MenuItem> {/* Added None option */}
                                 {/* Ensure config.availableApps exists before mapping */}
                                 {config?.availableApps?.map((app: AppDefinition) => (
                                     <MenuItem key={app.id} value={app.id}>{app.name} ({app.id})</MenuItem>
                                 ))}
                             </Select>
                         </FormControl>
                     </Box>
                 ))}


                 <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={handleCancelEdit} disabled={isSaving}>Cancel Edit</Button>
                    <Button variant="contained" onClick={handleSaveEdit} disabled={isSaving || !editingFrame?.name}>Apply Changes</Button>
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
                         disabled={isSaving || isEditMode} // Disable if saving or already editing
                     >
                         Create New Tab
                     </Button>
                 </Box>
                 <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                    Add, remove, or reorder the tabs visible in the main sidebar.
                 </Typography>
                 <List>
                     {/* Ensure editedFrames exists before mapping */}
                    {editedFrames?.map((frame, index) => (
                        <ListItem
                            key={frame.id || `frame-${index}`}
                            secondaryAction={
                                <>
                                    <IconButton
                                        aria-label={`Move ${frame.name} up`}
                                        size="small"
                                        onClick={() => handleMoveFrame(index, 'up')} // Simplified: removed !isEditMode check as list is hidden
                                        disabled={index === 0 || isSaving || isEditMode}
                                    ><ArrowUpwardIcon fontSize="inherit" /></IconButton>
                                    <IconButton
                                        aria-label={`Move ${frame.name} down`}
                                        size="small"
                                        onClick={() => handleMoveFrame(index, 'down')} // Simplified
                                        disabled={index === editedFrames.length - 1 || isSaving || isEditMode}
                                    ><ArrowDownwardIcon fontSize="inherit" /></IconButton>
                                    <IconButton
                                        aria-label={`Edit ${frame.name}`}
                                        size="small"
                                        onClick={() => handleEditFrame(frame)} // Simplified
                                        disabled={isSaving || isEditMode}
                                    ><SettingsIcon fontSize="inherit" /></IconButton>
                                    <IconButton
                                        aria-label={`Delete ${frame.name}`}
                                        size="small"
                                        onClick={() => handleDeleteFrame(frame.id)} // Added delete handler call
                                        disabled={isSaving || isEditMode}
                                    ><DeleteIcon fontSize="inherit" /></IconButton>
                                </>
                            }
                            // Removed sx opacity, whole list view is hidden now when editing
                            sx={{ borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}
                        >
                            <ListItemIcon sx={{ minWidth: '30px', cursor: 'grab' }} aria-hidden="true"><DragHandleIcon fontSize='small' /></ListItemIcon>
                            <ListItemText primary={frame.name || '(Unnamed Frame)'} secondary={`ID: ${frame.id || '(new)'}`} />
                        </ListItem>
                    ))}
                 </List>
                 {/* Display message if no frames exist */}
                 {editedFrames?.length === 0 && (
                    <Typography sx={{mt: 2, fontStyle: 'italic', textAlign: 'center'}}>
                        No tabs configured. Click "Create New Tab" to get started.
                    </Typography>
                 )}
              </Box>
            )}
          </Box>
        )}
      {/* **** Moved Closing DialogContent tag here **** */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaving || isEditMode || configLoading || !!configError} // Disable save if in edit mode
        >
          {isSaving ? <CircularProgress size={24} color="inherit"/> : 'Save All Preferences'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreferencesDialog;