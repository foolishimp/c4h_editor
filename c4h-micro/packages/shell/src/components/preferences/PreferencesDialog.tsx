// File: packages/shell/src/components/preferences/PreferencesDialog.tsx
// --- CORRECTED Full File ---

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

// Define type for Frame Template placeholders
interface FrameTemplate { id: string; name: string; slots: number; }

const PreferencesDialog: React.FC<PreferencesDialogProps> = ({ open, onClose }) => {
  // Get config, fetchConfig AND the prefsServiceUrl from context
  const { config, loading: configLoading, error: configError, fetchConfig, prefsServiceUrl } = useShellConfig();

  // State variables
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editedFrames, setEditedFrames] = useState<Frame[]>([]);
  const [editingFrame, setEditingFrame] = useState<Frame | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Placeholder Data
  const frameTemplates: FrameTemplate[] = [
      { id: 'template-1', name: 'Single App Layout', slots: 1 },
      { id: 'template-2', name: 'Two App Layout', slots: 2 },
      { id: 'template-3', name: 'Three App Layout', slots: 3 },
  ];

   // useEffect to initialize local state
   useEffect(() => {
    if (open && config?.frames) {
        const sortedFrames = [...config.frames]
                             .sort((a, b) => a.order - b.order)
                             .map(f => ({ ...f, assignedApps: [...(f.assignedApps || [])].map(app => ({ ...app })) }));
        setEditedFrames(sortedFrames);
        setSaveError(null); setSuccessMessage(null); setIsEditMode(false);
        setEditingFrame(null); setSelectedTemplateId('');
    }
   }, [open, config?.frames]);

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
      const newFrame: Frame = { id: `new-${Date.now()}`, name: 'New Tab', order: editedFrames.length, assignedApps: [] };
      setEditingFrame(newFrame); setSelectedTemplateId(''); setIsEditMode(true); setSuccessMessage(null); setSaveError(null);
  };

  const handleEditFrame = (frameToEdit: Frame) => {
      const template = frameTemplates.find(t => t.slots === frameToEdit.assignedApps.length);
      setSelectedTemplateId(template ? template.id : '');
      setEditingFrame({ ...frameToEdit, assignedApps: frameToEdit.assignedApps.map(app => ({ ...app })) });
      setIsEditMode(true); setSuccessMessage(null); setSaveError(null);
  };

   const handleCancelEdit = () => {
       setIsEditMode(false); setEditingFrame(null); setSelectedTemplateId('');
   };

   const handleDeleteFrame = (frameIdToDelete: string) => {
       if (window.confirm(`Are you sure you want to delete tab ${frameIdToDelete}? This takes effect after clicking 'Save All Preferences'.`)) {
           setEditedFrames(currentFrames => currentFrames.filter(f => f.id !== frameIdToDelete).map((frame, idx) => ({ ...frame, order: idx })));
           setSuccessMessage(null); setSaveError(null);
       }
   };

   const handleTemplateChange = (event: SelectChangeEvent<string>) => {
       const templateId = event.target.value; setSelectedTemplateId(templateId);
       const template = frameTemplates.find(t => t.id === templateId);
       const numberOfSlots = template ? template.slots : 0;
       if (editingFrame) {
           const currentApps = editingFrame.assignedApps;
           const newAssignedApps: AppAssignment[] = Array(numberOfSlots).fill(null).map((_, index) =>
              currentApps[index] ? { ...currentApps[index] } : { appId: '' }
           );
           setEditingFrame(prev => prev ? { ...prev, assignedApps: newAssignedApps } : null);
       }
   };

   const handleAppAssignmentChange = (slotIndex: number, event: SelectChangeEvent<string>) => {
        const appId = event.target.value;
        if (editingFrame) {
            const updatedApps = [...editingFrame.assignedApps];
            if (slotIndex >= 0 && slotIndex < updatedApps.length) {
                updatedApps[slotIndex] = { appId: appId };
                setEditingFrame(prev => prev ? { ...prev, assignedApps: updatedApps } : null);
            }
        }
   };

    // Saves changes made in edit mode *locally* to the editedFrames state
    const handleSaveEdit = () => {
        if (!editingFrame || !editingFrame.name.trim()) { setSaveError("Tab Name required."); return; }
        setSaveError(null);
        setEditedFrames(currentFrames => {
            const index = currentFrames.findIndex(f => f.id === editingFrame.id);
            const newFrames = [...currentFrames];
            const frameToSave = { ...editingFrame, assignedApps: editingFrame.assignedApps.map(app => ({...app})) };
            if (index !== -1) newFrames[index] = frameToSave; else newFrames.push(frameToSave);
            return newFrames.map((frame, idx) => ({ ...frame, order: idx }));
        });
        handleCancelEdit(); // Exit edit mode after applying changes locally
    };

  // Saves all local changes to the backend
  const handleSave = async () => {
      setIsSaving(true);
      setSaveError(null);
      setSuccessMessage(null);
      console.log("Attempting to save preferences...");
      try {
          const framesToSave = editedFrames.map((frame, idx) => ({ ...frame, order: idx }));
          const payload: ShellPreferencesRequest = { frames: framesToSave };

          // Use the prefsServiceUrl obtained from the context
          if (!prefsServiceUrl) {
              throw new Error("Preferences Service URL is not configured in context.");
          }
          // Construct the full URL for the preferences PUT request
          const saveUrl = `${prefsServiceUrl}/api/v1/shell/preferences`; // Targets port 8010

          console.log(`Saving preferences via PUT to: ${saveUrl}`);
          console.log("Payload:", JSON.stringify(payload, null, 2));

          // Use axios directly for this specific call
          const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
          const response = await axios.put<{ message: string }>(saveUrl, payload, { headers });

          console.log("Save response:", response.data);
          setSuccessMessage(response.data.message || 'Preferences saved successfully!');
          await fetchConfig(); // Refresh main config context
          setTimeout(() => {
               if (open) { onClose(); } // Close dialog only if still open
          }, 1500);

      } catch (err: any) {
          const errorDetail = err.response?.data?.detail || err.message || 'Failed to save preferences.';
          setSaveError(errorDetail);
          console.error("Error saving preferences:", err.response?.data || err);
      } finally {
          setIsSaving(false);
      }
  };

  // Utility to get slot count
  const getNumberOfSlots = (): number => {
      if (!editingFrame) return 0;
      const template = frameTemplates.find(t => t.id === selectedTemplateId);
      if (template) return template.slots;
      if (!selectedTemplateId && !editingFrame.id.startsWith('new-')) return editingFrame.assignedApps.length;
      return 0;
  };
  const numberOfSlots = getNumberOfSlots();

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
             {!configLoading && configError && !config && <Alert severity="error" sx={{ mb: 2 }}>Could not load initial configuration: {configError}</Alert>}

             {/* Save Operation Feedback */}
             {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}
             {saveError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>{saveError}</Alert>}

             {/* Render main content only if config was loaded or fetch attempted */}
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
                              />
                              <FormControl fullWidth margin="normal">
                                  <InputLabel id="frame-layout-label">Frame Layout Template</InputLabel>
                                  <Select
                                      labelId="frame-layout-label"
                                      value={selectedTemplateId}
                                      label="Frame Layout Template"
                                      onChange={handleTemplateChange}
                                  >
                                       <MenuItem value=""><em>Select a Layout...</em></MenuItem>
                                       {frameTemplates.map(template => (
                                           <MenuItem key={template.id} value={template.id}>
                                               {template.name} ({template.slots} app slot{template.slots !== 1 ? 's' : ''})
                                           </MenuItem>
                                       ))}
                                  </Select>
                              </FormControl>

                              {/* App Assignment Dropdowns */}
                              {numberOfSlots > 0 && (
                                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Assign Applications to Slots:</Typography>
                              )}
                              {Array.from({ length: numberOfSlots }).map((_, index) => (
                                  <Box key={`slot-${index}`} sx={{ display: 'flex', gap: 2, mb: 1.5, alignItems: 'center' }}>
                                       <Typography sx={{ width: '60px', textAlign: 'right', pr: 1, color: 'text.secondary'}}>Slot {index + 1}:</Typography>
                                       <FormControl fullWidth margin="none" size="small">
                                            <InputLabel id={`app-select-label-${index}`}>Select App</InputLabel>
                                            <Select
                                                labelId={`app-select-label-${index}`}
                                                value={editingFrame.assignedApps?.[index]?.appId || ''}
                                                label="Select App"
                                                onChange={(e) => handleAppAssignmentChange(index, e)}
                                            >
                                                <MenuItem value=""><em>-- Empty Slot --</em></MenuItem>
                                                {config?.availableApps?.map((app: AppDefinition) => (
                                                    <MenuItem key={app.id} value={app.id}>{app.name} ({app.id})</MenuItem>
                                                ))}
                                            </Select>
                                       </FormControl>
                                  </Box>
                              ))}

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
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1}}>
                                  <Typography variant="h6" gutterBottom sx={{mb:0}}>Manage Tabs</Typography>
                                  <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddNewFrame} disabled={isSaving || isEditMode}>
                                    Add New Tab
                                  </Button>
                             </Box>
                             <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                                 Add, remove, or reorder tabs. Changes only persist after clicking "Save All Preferences".
                             </Typography>
                             {/* List of Editable Frames */}
                             <List>
                                 {editedFrames?.map((frame, index) => (
                                     <ListItem
                                         key={frame.id || `frame-${index}`}
                                         secondaryAction={
                                             // Fragment needed for multiple action buttons
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
                                 <Typography sx={{mt: 3, p:2, fontStyle: 'italic', textAlign: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 1}}>
                                     No tabs configured. Click "Add New Tab" to get started.
                                 </Typography>
                             )}
                         </Box> // End List View Box
                     )}
                 </Box> // End Conditional Content Box
             )}
         </DialogContent>
         {/* Main Dialog Actions */}
         <DialogActions sx={{p: 2}}>
             <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
             <Button
                 onClick={handleSave}
                 variant="contained"
                 color="primary"
                 disabled={isSaving || isEditMode || configLoading || !!configError}
             >
                 {isSaving ? <CircularProgress size={24} color="inherit"/> : 'Save All Preferences'}
             </Button>
         </DialogActions>
     </Dialog>
  );
};

export default PreferencesDialog;