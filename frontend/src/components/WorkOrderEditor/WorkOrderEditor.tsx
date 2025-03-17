/**
 * File: frontend/src/components/WorkOrderEditor/WorkOrderEditor.tsx
 * 
 * WorkOrderEditor component for creating and editing work orders
 * Uses the WorkOrderContext for centralized state management
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Tabs, Tab, Button, TextField, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert
} from '@mui/material';

import { useWorkOrderContext, WorkOrderProvider } from '../../contexts/WorkOrderContext';
import { useWorkOrderApi } from '../../hooks/useWorkOrderApi';
import { useJobApi } from '../../hooks/useJobApi';
import { WorkOrderVersionControl } from './WorkOrderVersionControl';
import IntentConfigTab from './tabs/IntentConfigTab';
import SystemConfigTab from './tabs/SystemConfigTab';

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
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  // Get the ID either from props or from URL params
  const id = workOrderId || params.id;
  
  // State management from context
  const {
    workOrder,
    loading,
    error,
    saved,
    hasUnsavedChanges,
    loadWorkOrder,
    createNewWorkOrder,
    updateWorkOrderId,
    saveWorkOrder,
    submitWorkOrder,
    resetSavedState
  } = useWorkOrderContext();

  // Local component state
  const [activeTab, setActiveTab] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmDiscard, setConfirmDiscard] = useState<boolean>(false);
  
  // Additional API hooks
  const { archiveWorkOrder, unarchiveWorkOrder, getWorkOrderHistory } = useWorkOrderApi();
  const { submitJob } = useJobApi();

  // Load work order on component mount or workOrderId change
  useEffect(() => {
    if (id) {
      loadWorkOrder(id);
    } else {
      createNewWorkOrder();
    }
  }, [id, loadWorkOrder, createNewWorkOrder]);

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

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
          <Button variant="outlined" onClick={handleCloseClick} sx={{ mr: 2 }}>
            Close
          </Button>
          {id && (
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleArchiveToggle} 
              disabled={loading}
            >
              {workOrder.metadata.archived ? 'Unarchive' : 'Archive'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Work Order ID */}
      <TextField
        label="Work Order ID"
        fullWidth
        value={workOrder.id}
        onChange={(e) => updateWorkOrderId(e.target.value)}
        disabled={!!id}
        margin="normal"
        variant="outlined"
        helperText="Unique identifier for this work order"
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Intent Configuration" />
          <Tab label="System Configuration" />
          <Tab label="Versions" />
        </Tabs>
      </Box>

      {/* Intent Configuration Tab */}
      <Box role="tabpanel" hidden={activeTab !== 0} sx={{ mt: 3 }}>
        {activeTab === 0 && <IntentConfigTab />}
      </Box>

      {/* System Configuration Tab */}
      <Box role="tabpanel" hidden={activeTab !== 1} sx={{ mt: 3 }}>
        {activeTab === 1 && <SystemConfigTab />}
      </Box>

      {/* Versions Tab */}
      <Box role="tabpanel" hidden={activeTab !== 2} sx={{ mt: 3 }}>
        {activeTab === 2 && id && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Version History
            </Typography>
            <Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 3 }}>
              <WorkOrderVersionControl
                workOrderId={id}
                onFetchHistory={() => getWorkOrderHistory(id)}
                onLoadVersion={loadWorkOrder}
                currentVersion={workOrder.metadata.version}
              />
            </Box>
          </Box>
        )}
      </Box>

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

// Wrapper component that provides the context
export const WorkOrderEditor: React.FC<WorkOrderEditorProps> = (props) => {
  return (
    <WorkOrderProvider>
      <WorkOrderEditorContent {...props} />
    </WorkOrderProvider>
  );
};

export default WorkOrderEditor;