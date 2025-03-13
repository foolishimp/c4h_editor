// File: frontend/src/components/WorkOrderEditor/WorkOrderVersionControl.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { TimeAgo } from '../common/TimeAgo';

interface VersionInfo {
  version: string;
  commit_hash: string;
  created_at: string;
  author: string;
  message: string;
}

interface WorkOrderVersionControlProps {
  workOrderId: string;
  onLoadVersion: (versionId: string) => void;
  onFetchHistory: () => Promise<VersionInfo[]>;
}

export const WorkOrderVersionControl: React.FC<WorkOrderVersionControlProps> = ({ 
  workOrderId, 
  onLoadVersion, 
  onFetchHistory 
}) => {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (workOrderId) {
      loadHistory();
    }
  }, [workOrderId]);
  
  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const historyData = await onFetchHistory();
      setVersions(historyData);
    } catch (err) {
      setError((err as Error).message || 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLoadVersion = (versionId: string) => {
    onLoadVersion(versionId);
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
          Refresh
        </Button>
      </Box>
      
      {error && (
        <Typography color="error" variant="body2">{error}</Typography>
      )}
      
      {loading ? (
        <Typography variant="body2">Loading...</Typography>
      ) : versions.length === 0 ? (
        <Typography variant="body2">No version history available</Typography>
      ) : (
        <List dense sx={{ bgcolor: 'background.paper', maxHeight: 300, overflow: 'auto' }}>
          {versions.map((version) => (
            <ListItem key={version.commit_hash}>
              <ListItemText
                primary={`v${version.version} - ${version.message}`}
                secondary={
                  <>
                    By {version.author}, <TimeAgo timestamp={version.created_at} />
                  </>
                }
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  aria-label="restore" 
                  onClick={() => handleLoadVersion(version.commit_hash)}
                  size="small"
                >
                  <RestoreIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};