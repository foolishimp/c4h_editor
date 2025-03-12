export interface WorkOrderEditorProps {
  workOrderId: string;
  onSave: () => Promise<any>;
  onUpdate: () => Promise<any>;
  onDelete: () => void;
  onTest: () => void;
  onRender: () => Promise<string>;
  onGetHistory: (id: string) => Promise<any>;
  onGetVersion: (id: string, versionId: string) => Promise<any>;
}
export function WorkOrderEditor({
  workOrderId,
  onSave,
  onUpdate,
  onDelete,
  onTest,
  onRender,
  onGetHistory,
  onGetVersion
}: WorkOrderEditorProps) {
// File: frontend/src/components/WorkOrderEditor/WorkOrderEditor.tsx
import { useState, useEffect } from 'react';
import { Box, Grid, Typography, Button, CircularProgress, Tabs, Tab } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkOrder } from '../../types/workorder';
import { WorkOrderMetadataPanel } from './WorkOrderMetadataPanel';
import { WorkOrderParameterPanel } from './WorkOrderParameterPanel';
import { WorkOrderVersionControl } from './WorkOrderVersionControl';
import { WorkOrderTestRunner } from './WorkOrderTestRunner';
  setWorkOrder({
    id: '',
    template: {
      text: '',
      parameters: []
    },
    metadata: {
      author: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: '',
      tags: [],
      version: '1.0.0'
    }
  });

import Editor from '@monaco-editor/react';
import useWorkOrderApi from '../../hooks/useWorkOrderApi';

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  
  const {
    workOrder,
    loading,
    error,
    getWorkOrder,
    updateWorkOrder,
    createWorkOrderVersion,
    getWorkOrderVersion,
    getWorkOrderDiff
  } = useWorkOrderApi();

  const [localWorkOrder, setLocalWorkOrder] = useState<WorkOrder | null>(null);
  const [diffData, setDiffData] = useState<{ [versionId: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  setWorkOrder(prevState => {
    if (!prevState) return null;
    return {
      ...prevState,
      template: {
        ...prevState.template,
        parameters: updatedParameters
      }
    };
  });

  useEffect(() => {
    if (id) {
      getWorkOrder(id);
    }
  }, [id]);

  useEffect(() => {
    if (workOrder) {
      setLocalWorkOrder(workOrder);
    }
  }, [workOrder]);

  const handleContentChange = (value: string | undefined) => {
    if (!localWorkOrder || !value) return;
    
    setLocalWorkOrder({
      ...localWorkOrder,
      content: value
    });
  };

  const handleMetadataChange = (metadata: any) => {
    if (!localWorkOrder) return;
    
    setLocalWorkOrder({
      ...localWorkOrder,
      metadata
    });
  };

  const handleParametersChange = (parameters: any) => {
    if (!localWorkOrder) return;
    
    setLocalWorkOrder({
      ...localWorkOrder,
      parameters
    });
  };

  const handleSave = async () => {
    if (!localWorkOrder) return;
    
    setIsSaving(true);
    try {
      await updateWorkOrder(localWorkOrder.id, localWorkOrder);
      await getWorkOrder(localWorkOrder.id);
    } catch (error) {
      console.error("Error saving work order:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!localWorkOrder) return;
    
    setIsSaving(true);
    try {
      await createWorkOrderVersion(localWorkOrder.id);
      await getWorkOrder(localWorkOrder.id);
    } catch (error) {
      console.error("Error creating version:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVersionSelect = async (versionId: string) => {
    if (!localWorkOrder) return;
    
    try {
      const versionData = await getWorkOrderVersion(localWorkOrder.id, versionId);
      setLocalWorkOrder(versionData);
    } catch (error) {
      console.error("Error loading version:", error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const loadDiff = async (versionId: string) => {
    if (!localWorkOrder) return;
    
    try {
      const diff = await getWorkOrderDiff(localWorkOrder.id, versionId);
      setDiffData(prev => ({
        ...prev,
        [versionId]: diff.content_diff
      }));
    } catch (error) {
      console.error("Error loading diff:", error);
    }
  };

  if (loading && !localWorkOrder) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !localWorkOrder) {
    return (
      <Box p={3}>
        <Typography color="error">
          Error loading work order: {error || "Work order not found"}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/workorders')}
          sx={{ mt: 2 }}
        >
          Return to Work Order List
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {localWorkOrder.metadata?.title || 'Untitled Work Order'}
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={isSaving}
            sx={{ mr: 1 }}
          >
            {isSaving ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/workorders')}
          >
            Back to List
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Editor" />
        <Tab label="Test" />
        <Tab label="History" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box sx={{ height: 'calc(100vh - 300px)', border: '1px solid #e0e0e0' }}>
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={localWorkOrder.content}
                onChange={handleContentChange}
                options={{
                  minimap: { enabled: false },
                  wordWrap: 'on'
                }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <WorkOrderMetadataPanel
                metadata={localWorkOrder.metadata}
                onChange={handleMetadataChange}
              />
              <WorkOrderParameterPanel
                parameters={localWorkOrder.parameters}
                onChange={handleParametersChange}
              />
            </Box>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <WorkOrderTestRunner workOrder={localWorkOrder} />
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <WorkOrderVersionControl
              workOrderId={localWorkOrder.id}
              currentVersion="current"
              versions={localWorkOrder.versions || []}
              onVersionSelect={handleVersionSelect}
              onCreateVersion={handleCreateVersion}
              diffs={diffData}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Version Comparison
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Select a version from the list to view differences with the current version.
            </Typography>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default WorkOrderEditor;