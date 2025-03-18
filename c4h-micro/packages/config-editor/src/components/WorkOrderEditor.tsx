// File: packages/config-editor/src/components/WorkOrderEditor.tsx
/**
 * Streamlined WorkOrderEditor component that uses YAML as the primary editing interface.
 * Removes all technical debt and complexity from the previous implementation.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert, Paper
} from '@mui/material';

import { useWorkOrderContext } from '../contexts/WorkOrderContext';
import { useWorkOrderApi } from '../hooks/useWorkOrderApi';
// Import the entire module to access the submitJob function
import useJobApi from '../hooks/useJobApi';
import { WorkOrderVersionControl } from './WorkOrderVersionControl';
import { YamlEditor } from './YAMLEditor';

export interface WorkOrderEditorProps {
  workOrderId?: string;
  onSave?: (workOrder: any) => void;
  onClose?: () => void;
}

// Inner component that uses the context
const WorkOrderEditorContent: React.FC<WorkOrderEditorProps> = ({
  workOrderId,
  onSave,
  onClose
}) => {
  // Router params
  const params = useParams<Record<string, string | undefined>>();
  const navigate = useNavigate();
  
  // Get the ID either from props or from URL params
  const id = workOrderId || params.id;
  
  // State management from context
  const {
    workOrder,
    yaml,
    loading,
    error,
    saved,
    hasUnsavedChanges,
    loadWorkOrder,
    createNewWorkOrder,
    updateWorkOrderId,
    updateYaml,
    saveWorkOrder,
    submitWorkOrder,
    resetSavedState
  } = useWorkOrderContext();

  // Local component state
  const [showVersions, setShowVersions] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmDiscard, setConfirmDiscard] = useState<boolean>(false);
  
  // Additional API hooks
  const { archiveWorkOrder, unarchiveWorkOrder, getWorkOrderHistory } = useWorkOrderApi();
  // Use the useJobApi hook with proper typing
  const { submitJob } = useJobApi();

  // Load work order on component mount or workOrderId change
  useEffect(() => {
    if (id) {
      loadWorkOrder(id);
    } else {
      createNewWorkOrder();
    }
  }, [id, loadWorkOrder, createNewWorkOrder]);

  // Handle close button click
  const handleCloseClick = (): void => {
    if (hasUnsavedChanges) {
      setConfirmDiscard(true);
    } else if (onClose) {
      onClose();
    } else {
      navigate('/workorders');
    }
  };

  // Confirm discard dialog handlers
  const handleConfirmDiscard = (): void => {
    setConfirmDiscard(false);
    if (onClose) {
      onClose();
    } else {
      navigate('/workorders');
    }
  };

  const handleCancelDiscard = (): void => {
    setConfirmDiscard(false);
  };

  // Handle archive/unarchive
  const handleArchiveToggle = async () => {
    if (!workOrder || !id) return;
    
    try {
      const isArchived = workOrder.metadata.archived || false;
      if (isArchived) {
        await unarchiveWorkOrder(id);
      } else {
        await archiveWorkOrder(id);
      }
      // Reload the work order to get updated archive status
      await loadWorkOrder(id);
    } catch (err) {
      console.error(`Failed to ${workOrder.metadata.archived ? 'unarchive' : 'archive'} work order:`, err);
    }
  };

  // Handle save
  const handleSave = async (): Promise<void> => {
    const result = await saveWorkOrder();
    
    if (result && onSave) {
      onSave(result);
    }
    
    // If this was a new workOrder, navigate to the edit page
    if (!id && result?.id) {
      navigate(`/workorders/${result.id}`);
    }
  };

  // Handle submit as job
  const handleSubmitJob = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const savedWorkOrder = await submitWorkOrder();
      
      if (savedWorkOrder) {
        const result = await submitJob({ workOrderId: savedWorkOrder.id });
        if (result) {
          navigate('/jobs');
        }
      }
    } catch (err) {
      console.error('Failed to submit job:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !workOrder) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!workOrder) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Failed to load work order. Please try again.
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">
          {id ? `Edit Work Order: ${workOrder.id}` : 'Create New Work Order'}
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSubmitJob} 
            disabled={loading || submitting || !workOrder.id}
            sx={{ mr: 2 }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit Work Order'}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={loading}
            sx={{ mr: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
          {id && (
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={() => setShowVersions(!showVersions)}
              sx={{ mr: 2 }}
            >
              {showVersions ? 'Hide Versions' : 'Show Versions'}
            </Button>
          )}
          <Button variant="outlined" onClick={handleCloseClick} sx={{ mr: 2 }}>
            Close
          </Button>
          {id && (
            <Button 
              variant="outlined" 
              color="warning" 
              onClick={handleArchiveToggle} 
              disabled={loading}
            >
              {workOrder.metadata.archived ? 'Unarchive' : 'Archive'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Work Order ID (only for new work orders) */}
      {!id && (
        <TextField
          label="Work Order ID"
          fullWidth
          value={workOrder.id}
          onChange={(e) => updateWorkOrderId(e.target.value)}
          margin="normal"
          variant="outlined"
          helperText="Unique identifier for this work order"
          sx={{ mb: 3 }}
        />
      )}

      {/* Version History (conditionally shown) */}
      {showVersions && id && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Version History
          </Typography>
          <WorkOrderVersionControl
            workOrderId={id}
            onFetchHistory={() => getWorkOrderHistory(id)}
            onLoadVersion={loadWorkOrder}
            currentVersion={workOrder.metadata.version}
          />
        </Paper>
      )}

      {/* YAML Editor */}
      <YamlEditor
        yaml={yaml}
        onChange={updateYaml}
        onSave={handleSave}
      />

      {/* Notifications */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={resetSavedState}>
        <Alert onClose={resetSavedState} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={saved} autoHideDuration={6000} onClose={resetSavedState}>
        <Alert onClose={resetSavedState} severity="success" sx={{ width: '100%' }}>
          Work order saved successfully!
        </Alert>
      </Snackbar>

      {/* Discard Changes Dialog */}
      <Dialog open={confirmDiscard} onClose={handleCancelDiscard}>
        <DialogTitle>Discard changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Are you sure you want to discard them?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDiscard}>Cancel</Button>
          <Button onClick={handleConfirmDiscard} color="error">Discard</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Wrapper component that simply returns the content
// WorkOrderProvider is not needed here as it's already provided in ConfigEditor.tsx
export const WorkOrderEditor: React.FC<WorkOrderEditorProps> = (props) => {
  return <WorkOrderEditorContent {...props} />;
};

export default WorkOrderEditor;