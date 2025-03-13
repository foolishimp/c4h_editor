// File: frontend/src/components/WorkOrderEditor/WorkOrderEditor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Button, TextField, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert
} from '@mui/material';
import { WorkOrder, WorkOrderMetadata, WorkOrderParameter } from '../../types/workorder';
import { WorkOrderParameterPanel } from './WorkOrderParameterPanel';
import { WorkOrderMetadataPanel } from './WorkOrderMetadataPanel';
import { WorkOrderTestRunner } from './WorkOrderTestRunner';
import { WorkOrderVersionControl } from './WorkOrderVersionControl';
import { useWorkOrderApi } from '../../hooks/useWorkOrderApi';

export interface WorkOrderEditorProps {
  workOrderId?: string;
  onSave?: (workOrder: WorkOrder) => void;
  onClose?: () => void;
}

export const WorkOrderEditor: React.FC<WorkOrderEditorProps> = ({
  workOrderId,
  onSave,
  onClose
}) => {
  // State management
  const [activeTab, setActiveTab] = useState<number>(0);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [originalWorkOrder, setOriginalWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const [confirmDiscard, setConfirmDiscard] = useState<boolean>(false);
  
  // Access API hooks - destructure only what we need
  const {
    fetchWorkOrder,  // Changed from getWorkOrder
    updateWorkOrder,
    testWorkOrder,
    getWorkOrderHistory
  } = useWorkOrderApi();

  // Load work order on component mount or workOrderId change
  useEffect(() => {
    if (workOrderId) {
      loadWorkOrder(workOrderId);
    } else {
      createNewWorkOrder();
    }
  }, [workOrderId]);

  const loadWorkOrder = async (id: string): Promise<void> => {
    setLoading(true);
    try {
      const result = await fetchWorkOrder(id);  // Changed from getWorkOrder
      setWorkOrder(result);
      setOriginalWorkOrder(JSON.parse(JSON.stringify(result))); // Deep clone
    } catch (err) {
      setError(`Failed to load work order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const createNewWorkOrder = (): void => {
    const newWorkOrder: WorkOrder = {
      id: '',
      template: {
        text: '',
        parameters: [],
        config: {
          temperature: 0.7,
          max_tokens: 1000
        }
      },
      metadata: {
        author: 'Current User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: '',
        tags: [],
        version: '1.0.0'
      },
      lineage: []
    };
    
    setWorkOrder(newWorkOrder);
    setOriginalWorkOrder(JSON.parse(JSON.stringify(newWorkOrder))); // Deep clone
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!workOrder) return;
    
    setWorkOrder({
      ...workOrder,
      template: {
        ...workOrder.template,
        text: e.target.value
      }
    });
  };

  const handleUpdateParameters = useCallback((updatedParameters: WorkOrderParameter[]): void => {
    if (!workOrder) return;
    
    setWorkOrder({
      ...workOrder,
      template: {
        ...workOrder.template,
        parameters: updatedParameters
      }
    });
  }, [workOrder]);

  const handleUpdateMetadata = useCallback((updatedMetadata: WorkOrderMetadata): void => {
    if (!workOrder) return;
    
    setWorkOrder({
      ...workOrder,
      metadata: updatedMetadata
    });
  }, [workOrder]);

  const handleSave = async (): Promise<void> => {
    if (!workOrder) return;
    
    setLoading(true);
    try {
      // FIX: Type safety, ensure workOrder is not null
      const result = await updateWorkOrder(workOrder);
      
      setWorkOrder(result);
      setOriginalWorkOrder(JSON.parse(JSON.stringify(result))); // Deep clone
      setSaved(true);
      
      if (onSave) {
        onSave(result);
      }
    } catch (err) {
      setError(`Failed to save work order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = useCallback(async (): Promise<void> => {
    if (!workOrder) return;
    
    setLoading(true);
    try {
      // Pass id and parameters separately
      const result = await testWorkOrder(workOrder.id, {});
      
      console.log("Test result:", result);
    } catch (err) {
      setError(`Failed to test work order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [workOrder, testWorkOrder]);

  const handleGetHistory = useCallback(async (id: string) => {
    try {
      return await getWorkOrderHistory(id);
    } catch (err) {
      setError(`Failed to get history: ${err instanceof Error ? err.message : String(err)}`);
      return { versions: [] };
    }
  }, [getWorkOrderHistory]);

  const handleGetVersion = useCallback(async (id: string, versionId: string) => {
    try {
      // Using fetchWorkOrder as a workaround since getWorkOrderVersion doesn't exist
      return await fetchWorkOrder(id);
    } catch (err) {
      setError(`Failed to get version: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }, [fetchWorkOrder]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

  const handleCloseClick = (): void => {
    // Check if changes were made
    if (JSON.stringify(workOrder) !== JSON.stringify(originalWorkOrder)) {
      setConfirmDiscard(true);
    } else if (onClose) {
      onClose();
    }
  };

  const handleConfirmDiscard = (): void => {
    setConfirmDiscard(false);
    if (onClose) {
      onClose();
    }
  };

  const handleCancelDiscard = (): void => {
    setConfirmDiscard(false);
  };

  const handleCloseNotification = (): void => {
    setError(null);
    setSaved(false);
  };

  // Fallback loading UI
  if (loading && !workOrder) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Fallback for missing workOrder
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
          {workOrderId ? `Edit Work Order: ${workOrder.id}` : 'Create New Work Order'}
        </Typography>
        <Box>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
          <Button variant="outlined" onClick={handleCloseClick} sx={{ ml: 2 }}>
            Close
          </Button>
        </Box>
      </Box>

      {/* Work Order ID */}
      <TextField
        label="Work Order ID"
        fullWidth
        value={workOrder.id}
        onChange={(e) => setWorkOrder({ ...workOrder, id: e.target.value })}
        disabled={!!workOrderId} // Disable if editing existing
        margin="normal"
        variant="outlined"
        helperText="Unique identifier for this work order"
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Content" />
          <Tab label="Parameters" />
          <Tab label="Metadata" />
          <Tab label="Test" />
          <Tab label="Versions" />
        </Tabs>
      </Box>

      {/* Content Tab */}
      <Box role="tabpanel" hidden={activeTab !== 0} sx={{ mt: 3 }}>
        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Work Order Content
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={15}
              value={workOrder.template.text}
              onChange={handleTextChange}
              placeholder="Enter the work order text here..."
              variant="outlined"
            />
          </Box>
        )}
      </Box>

      {/* Parameters Tab */}
      <Box role="tabpanel" hidden={activeTab !== 1} sx={{ mt: 3 }}>
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Parameters
            </Typography>
            {/* FIX: Match props to WorkOrderParameterPanel interface */}
            <WorkOrderParameterPanel
              parameters={workOrder.template.parameters}
              onUpdateParameters={handleUpdateParameters}
              disabled={false}
            />
          </Box>
        )}
      </Box>

      {/* Metadata Tab */}
      <Box role="tabpanel" hidden={activeTab !== 2} sx={{ mt: 3 }}>
        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Metadata
            </Typography>
            <WorkOrderMetadataPanel
              metadata={workOrder.metadata}
              onChange={handleUpdateMetadata}
              disabled={false}
            />
          </Box>
        )}
      </Box>

      {/* Test Tab */}
      <Box role="tabpanel" hidden={activeTab !== 3} sx={{ mt: 3 }}>
        {activeTab === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Test Work Order
            </Typography>
            {/* Changed this to WorkOrderTestRunner with correct props */}
            <WorkOrderTestRunner
              workOrder={workOrder}
              onTest={handleTest}
            />
          </Box>
        )}
      </Box>

      {/* Versions Tab */}
      <Box role="tabpanel" hidden={activeTab !== 4} sx={{ mt: 3 }}>
        {activeTab === 4 && workOrderId && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Version History
            </Typography>
            {/* Fixed prop names to match the component interface */}
            <WorkOrderVersionControl
              workOrderId={workOrderId || ""}
              onFetchHistory={() => handleGetHistory(workOrderId || "")}
              onLoadVersion={(versionId) => handleGetVersion(workOrderId || "", versionId)}
              currentVersion={workOrder.metadata.version}
            />
          </Box>
        )}
      </Box>

      {/* Notifications */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseNotification}>
        <Alert onClose={handleCloseNotification} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={saved} autoHideDuration={6000} onClose={handleCloseNotification}>
        <Alert onClose={handleCloseNotification} severity="success" sx={{ width: '100%' }}>
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

export default WorkOrderEditor;