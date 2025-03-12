import { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import TimeAgo from '../common/TimeAgo';
import { DiffViewer } from '../common/DiffViewer';
import { WorkOrderVersion } from '../../types/workorder';

interface WorkOrderVersionControlProps {
  workOrderId: string;
  currentVersion: string;
  versions: WorkOrderVersion[];
  onVersionSelect: (versionId: string) => void;
  onCreateVersion: () => void;
  readOnly?: boolean;
  diffs?: { [versionId: string]: string };
}

export const WorkOrderVersionControl = ({
  workOrderId,
  currentVersion,
  versions,
  onVersionSelect,
  onCreateVersion,
  readOnly = false,
  diffs = {}
}: WorkOrderVersionControlProps) => {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [openDiffDialog, setOpenDiffDialog] = useState(false);
  
  useEffect(() => {
    setSelectedVersion(currentVersion);
  }, [currentVersion]);

  const handleVersionSelect = (versionId: string) => {
    if (versionId === currentVersion) return;
    setSelectedVersion(versionId);
    onVersionSelect(versionId);
  };

  const handleCreateVersion = () => {
    if (readOnly) return;
    onCreateVersion();
  };

  const handleOpenDiff = (versionId: string) => {
    setSelectedVersion(versionId);
    setOpenDiffDialog(true);
  };

  const handleCloseDiff = () => {
    setOpenDiffDialog(false);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Versions</Typography>
        {!readOnly && (
          <Button 
            variant="contained" 
            size="small" 
            onClick={handleCreateVersion}
          >
            Create New Version
          </Button>
        )}
      </Box>
      
      <List className="version-list">
        {versions.map((version) => (
          <ListItem 
            key={version.id} 
            button 
            selected={version.id === currentVersion}
            onClick={() => handleVersionSelect(version.id)}
          >
            <ListItemText 
              primary={`v${version.version_number}`} 
              secondary={
                <>
                  <Typography component="span" variant="body2">
                    Created <TimeAgo date={new Date(version.created_at)} />
                  </Typography>
                  <Typography component="span" variant="body2" display="block">
                    By {version.author}
                  </Typography>
                </>
              } 
            />
            {version.id !== currentVersion && (
              <Button 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDiff(version.id);
                }}
              >
                View Diff
              </Button>
            )}
          </ListItem>
        ))}
      </List>
      
      <Dialog open={openDiffDialog} onClose={handleCloseDiff} maxWidth="lg" fullWidth>
        <DialogTitle>
          {versions.find(v => v.id === selectedVersion)?.version_number 
            ? `Changes in v${versions.find(v => v.id === selectedVersion)?.version_number}` 
            : 'Version Differences'}
        </DialogTitle>
        <DialogContent>
          {selectedVersion && diffs[selectedVersion] ? (
            <DiffViewer diff={diffs[selectedVersion]} />
          ) : (
            <Typography>No diff available for this version.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDiff}>Close</Button>
          <Button 
            onClick={() => {
              handleVersionSelect(selectedVersion || '');
              handleCloseDiff();
            }} 
            color="primary"
          >
            Switch to This Version
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};