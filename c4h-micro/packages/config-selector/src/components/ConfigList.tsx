import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon
} from '@mui/icons-material';
import { useConfigContext } from '../contexts/ConfigContext';
import { configTypes, TimeAgo } from 'shared';

// Props interface to accept navigation functions from parent
interface ConfigListProps {
  onEdit?: (id: string) => void;
  onCreateNew?: () => void;
}

const ConfigList: React.FC<ConfigListProps> = ({ onEdit, onCreateNew }) => {
  const { 
    configType, 
    configs, 
    loadConfigs, 
    archiveConfig,
    cloneConfig,
    deleteConfig,
    loading,
    error
  } = useConfigContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [filteredConfigs, setFilteredConfigs] = useState<any[]>([]);
  
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [newConfigId, setNewConfigId] = useState('');
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Config name from registry
  const configName = configTypes[configType]?.name || configType;

  // Helper function to get description from config
  const getDescription = (config: any): string => {
    // Check for both metadata.description and title field (API returns description as title in list response)
    const description = (config.metadata?.description?.trim() || config.title || '').trim() || 'No description';
    console.log('ConfigList: Config description:', {
      config_id: config.id,
      metadata_description: config.metadata?.description,
      title: config.title,
      final_description: description
    });
    return description;
  };
  
  // Custom navigation handler that doesn't rely on React Router
  const handleNavigate = (path: string) => {
    window.location.href = path;
  };
  
  // Load configs on mount and when configType changes
  useEffect(() => {
    loadConfigs();
    console.log('ConfigList: Loading configs for type:', configType);
  }, [configType, loadConfigs]);
  
  // Filter configs based on search term and archived status
  useEffect(() => {
    let filtered = configs || [];
    
    // Filter by archived status
    filtered = filtered.filter(config => 
      showArchived ? config.metadata?.archived : !config.metadata?.archived
    );
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(config => 
        config.id.toLowerCase().includes(term) || 
        getDescription(config).toLowerCase().includes(term)
      );
    }
    
    setFilteredConfigs(filtered);
  }, [configs, searchTerm, showArchived]);
  
  // Handle create new config
  const handleCreateNew = () => {
    console.log('ConfigList: Create new button clicked for type:', configType);
    if (onCreateNew) {
      console.log('ConfigList: Using onCreateNew callback');
      onCreateNew();
    } else {
      console.log('ConfigList: Using direct navigation');
      handleNavigate(`/configs/${configType}/new`);
    }
  };
  
  // Handle edit config
  const handleEdit = (id: string) => {
    if (onEdit) {
      onEdit(id);
    } else {
      handleNavigate(`/configs/${configType}/${id}`);
    }
  };
  
  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedConfigId(id);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedConfigId(null);
  };
  
  // Handle archive/unarchive
  const handleArchiveToggle = async () => {
    if (selectedConfigId) {
      const isArchived = configs.find(c => c.id === selectedConfigId)?.metadata?.archived || false;
      await archiveConfig(selectedConfigId, !isArchived);
      handleMenuClose();
    }
  };
  
  // Handle clone dialog open
  const handleCloneClick = () => {
    if (selectedConfigId) {
      setNewConfigId(`${selectedConfigId}-copy`);
      setShowCloneDialog(true);
      handleMenuClose();
    }
  };
  
  // Handle clone confirm
  const handleCloneConfirm = async () => {
    if (selectedConfigId && newConfigId) {
      await cloneConfig(selectedConfigId, newConfigId);
      setShowCloneDialog(false);
      setNewConfigId('');
    }
  };
  
  // Handle clone dialog close
  const handleCloneCancel = () => {
    setShowCloneDialog(false);
    setNewConfigId('');
  };
  
  // Handle delete dialog open
  const handleDeleteClick = () => {
    if (selectedConfigId) {
      setShowDeleteDialog(true);
      handleMenuClose();
    }
  };
  
  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (selectedConfigId) {
      await deleteConfig(selectedConfigId);
      setShowDeleteDialog(false);
    }
  };
  
  // Handle delete dialog close
  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{configName} List</Typography>
        <Box>
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={loadConfigs}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleCreateNew}
          >
            Create New {configName}
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField
          placeholder={`Search ${configName.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ mr: 2, flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <IconButton 
          onClick={() => setShowArchived(!showArchived)} 
          color={showArchived ? "primary" : "default"}
          title={showArchived ? "Hide archived" : "Show archived"}
        >
          {showArchived ? <UnarchiveIcon /> : <ArchiveIcon />}
        </IconButton>
      </Box>
      
      {error && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && filteredConfigs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredConfigs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {searchTerm 
                    ? `No ${configName.toLowerCase()} found matching your search.` 
                    : showArchived 
                      ? `No archived ${configName.toLowerCase()} found.` 
                      : `No ${configName.toLowerCase()} found. Create your first one!`}
                </TableCell>
              </TableRow>
            ) : (
              filteredConfigs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>{config.id}</TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ fontStyle: getDescription(config) === 'No description' ? 'italic' : 'normal' }}
                    >
                      {getDescription(config)}
                    </Typography>
                    {config.metadata?.tags && config.metadata.tags.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {config.metadata.tags.map((tag: string) => (
                          <Chip 
                            key={tag} 
                            label={tag} 
                            size="small" 
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{config.metadata?.author}</TableCell>
                  <TableCell>
                    <TimeAgo timestamp={config.metadata?.updated_at} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleEdit(config.id)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, config.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleArchiveToggle}>
          {configs && selectedConfigId && configs.find(c => c.id === selectedConfigId)?.metadata?.archived 
            ? 'Unarchive' 
            : 'Archive'}
        </MenuItem>
        <MenuItem onClick={handleCloneClick}>Clone</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>Delete</MenuItem>
      </Menu>
      
      {/* Clone Dialog */}
      <Dialog open={showCloneDialog} onClose={handleCloneCancel}>
        <DialogTitle>Clone {configName}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a new ID for the cloned {configName.toLowerCase()}.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label={`New ${configName} ID`}
            fullWidth
            value={newConfigId}
            onChange={(e) => setNewConfigId(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloneCancel}>Cancel</Button>
          <Button onClick={handleCloneConfirm} disabled={!newConfigId.trim()}>Clone</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onClose={handleDeleteCancel}>
        <DialogTitle>Delete {configName}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this {configName.toLowerCase()}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConfigList;