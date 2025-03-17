// File: packages/config-editor/src/components/WorkOrderVersionControl.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import CompareIcon from '@mui/icons-material/Compare';
import { WorkOrderVersionInfo } from 'shared';
import DiffViewer from '../common/DiffViewer';
import TimeAgo from '../common/TimeAgo';

interface WorkOrderVersionControlProps {
  workOrderId: string;
  currentVersion: string;
  onLoadVersion: (versionId: string) => Promise<any>;
  onFetchHistory: () => Promise<any>;
}

export const WorkOrderVersionControl: React.FC<WorkOrderVersionControlProps> = ({ 
  workOrderId, 
  currentVersion,
  onLoadVersion, 
  onFetchHistory
}) => {
  const [versions, setVersions] = useState<WorkOrderVersionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffData, setDiffData] = useState<{from: string, to: string, fromContent: string, toContent: string} | null>(null);
  
  // Load version history when component mounts
  useEffect(() => {
    if (workOrderId) {
      loadHistory();
    }
  }, [workOrderId]);
  
  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const historyResponse = await onFetchHistory();
      if (historyResponse && historyResponse.versions) {
        setVersions(historyResponse.versions);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLoadVersion = async (versionId: string) => {
    setLoading(true);
    try {
      await onLoadVersion(versionId);
    } catch (err) {
      setError((err as Error).message || 'Failed to load version');
    } finally {
      setLoading(false);
    }
  };
  
  const handleShowDiff = async (fromVersion: WorkOrderVersionInfo, toVersion: WorkOrderVersionInfo) => {
    // For now, we'll just show a placeholder diff
    // In a real implementation, you would fetch the actual contents of both versions
    setDiffData({
      from: fromVersion.version,
      to: toVersion.version,
      fromContent: `WorkOrder version ${fromVersion.version} by ${fromVersion.author}`,
      toContent: `WorkOrder version ${toVersion.version} by ${toVersion.author}`
    });
    setShowDiff(true);
  };
  
  const handleCloseDiff = () => {
    setShowDiff(false);
    setDiffData(null);
  };
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Version History</Typography>
        <Button 
          size="small" 
          onClick={loadHistory} 
          disabled={loading}
        >
          {loading ? <CircularProgress size={16} /> : 'Refresh'}
        </Button>
      </Box>
      
      {error && (
        <Typography color="error" variant="body2" mb={2}>{error}</Typography>
      )}
      
      {loading && versions.length === 0 ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : versions.length === 0 ? (
        <Typography variant="body2">No version history available</Typography>
      ) : (
        <List dense sx={{ bgcolor: 'background.paper', maxHeight: 400, overflow: 'auto' }}>
          {versions.map((version, index) => (
            <ListItem key={version.commit_hash} divider>
              <ListItemText
                primary={
                  <Typography variant="subtitle2">
                    {version.version} 
                    {index === 0 && ' (Latest)'}
                    {version.commit_hash === currentVersion && ' (Current)'}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="body2" component="span">
                      {version.message}
                    </Typography>
                    <Typography variant="caption" display="block">
                      By {version.author}, <TimeAgo timestamp={version.created_at} />
                    </Typography>
                  </>
                }
              />
              <ListItemSecondaryAction>
                {index > 0 && (
                  <IconButton 
                    edge="end" 
                    aria-label="compare" 
                    onClick={() => handleShowDiff(versions[index - 1], version)}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    <CompareIcon />
                  </IconButton>
                )}
                <IconButton 
                  edge="end" 
                  aria-label="restore" 
                  onClick={() => handleLoadVersion(version.commit_hash)}
                  size="small"
                  disabled={version.commit_hash === currentVersion}
                >
                  <RestoreIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
      
      {/* Diff Dialog */}
      <Dialog
        open={showDiff}
        onClose={handleCloseDiff}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Compare Versions: {diffData?.from} to {diffData?.to}
        </DialogTitle>
        <DialogContent>
          {diffData && (
            <DiffViewer 
              oldContent={diffData.fromContent}
              newContent={diffData.toContent}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDiff}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkOrderVersionControl;