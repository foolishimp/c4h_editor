#!/usr/bin/env python3
# migration_script_2bb.py
#
# This script creates the ConfigList and TimeAgo components for the ConfigSelector microfrontend:
# 1. Creates TimeAgo utility component
# 2. Creates ConfigList for displaying the list of configurations

import os
from pathlib import Path

BASE_DIR = Path("c4h-micro")

def create_directory(path):
    if not path.exists():
        print(f"Creating directory: {path}")
        path.mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)

def create_components():
    config_selector_dir = BASE_DIR / "packages" / "config-selector"
    
    # Ensure components directory exists
    create_directory(config_selector_dir / "src" / "components")
    
    # Create TimeAgo component
    time_ago = """// File: packages/config-selector/src/components/TimeAgo.tsx
import React from 'react';
import { Tooltip, Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

interface TimeAgoProps {
  timestamp?: string;
  date?: string;
  typography?: boolean;
  variant?: 'body1' | 'body2' | 'caption';
}

const TimeAgo: React.FC<TimeAgoProps> = ({ 
  timestamp, 
  date,
  typography = true, 
  variant = 'body2' 
}) => {
  const dateString = timestamp || date;
  
  if (!dateString) {
    return null;
  }

  try {
    const dateObj = new Date(dateString);
    
    if (isNaN(dateObj.getTime())) {
      console.error(`Invalid date: ${dateString}`);
      return null;
    }
    
    const timeAgo = formatDistanceToNow(dateObj, { addSuffix: true });
    const formattedDate = dateObj.toLocaleString();
    
    const content = (
      <Tooltip title={formattedDate}>
        <span>{timeAgo}</span>
      </Tooltip>
    );
    
    if (typography) {
      return <Typography variant={variant}>{content}</Typography>;
    }
    
    return content;
  } catch (error) {
    console.error(`Error parsing date: ${dateString}`, error);
    return null;
  }
};

export default TimeAgo;
"""
    
    write_file(config_selector_dir / "src" / "components" / "TimeAgo.tsx", time_ago)
    
    # Create ConfigList component
    config_list = """// File: packages/config-selector/src/components/ConfigList.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { configTypes } from 'shared';
import TimeAgo from './TimeAgo';

const ConfigList: React.FC = () => {
  const navigate = useNavigate();
  const { 
    configType, 
    configs, 
    loadConfigs, 
    createNewConfig,
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
  
  // Load configs on mount and when configType changes
  useEffect(() => {
    loadConfigs();
  }, [configType, loadConfigs]);
  
  // Filter configs based on search term and archived status
  useEffect(() => {
    let filtered = configs;
    
    // Filter by archived status
    filtered = filtered.filter(config => 
      showArchived ? config.metadata?.archived : !config.metadata?.archived
    );
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(config => 
        config.id.toLowerCase().includes(term) ||
        (config.metadata?.description && config.metadata.description.toLowerCase().includes(term))
      );
    }
    
    setFilteredConfigs(filtered);
  }, [configs, searchTerm, showArchived]);
  
  // Handle create new config
  const handleCreateNew = () => {
    createNewConfig();
    navigate(`/${configType}/new`);
  };
  
  // Handle edit config
  const handleEdit = (id: string) => {
    navigate(`/${configType}/${id}`);
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
                    <Typography variant="body2">
                      {config.metadata?.description || 'No description'}
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
          {configs.find(c => c.id === selectedConfigId)?.metadata?.archived ? 'Unarchive' : 'Archive'}
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
"""
    
    write_file(config_selector_dir / "src" / "components" / "ConfigList.tsx", config_list)
    
    print("TimeAgo and ConfigList components created successfully!")

if __name__ == "__main__":
    create_components()