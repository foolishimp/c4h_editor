import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableSortLabel,
  TablePagination,
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

// Define sort direction type
type SortDirection = 'asc' | 'desc';
// Define sort field type
type SortField = 'id' | 'description' | 'author' | 'updated_at'; // Add 'updated_at' if check determined it was missing
// Interface for sort state
interface SortState {
  field: SortField;
  direction: SortDirection;
}

const DEFAULT_ROWS_PER_PAGE = 25;

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
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [sort, setSort] = useState<SortState>({ field: 'updated_at', direction: 'desc' });

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [newConfigId, setNewConfigId] = useState('');
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Config name from registry
  const configName = configTypes[configType]?.name || configType;

  // Helper function to get description from config
  const getDescription = (config: any): string => {
    // Check for both metadata.description and title field (API returns description as title in list response)
    const description = (config.metadata?.description?.trim() || config.title || '').trim() || 'No description';
    // console.log('ConfigList: Config description:', { // Keep console logs minimal or remove for production
    //   config_id: config.id,
    //   metadata_description: config.metadata?.description,
    //   title: config.title,
    //   final_description: description
    // });
    return description;
  };

  // Custom navigation handler that doesn't rely on React Router
  const handleNavigate = (path: string) => {
    window.location.href = path;
  };

  // Load configs on mount and when configType changes
  useEffect(() => {
    loadConfigs();
    // console.log('ConfigList: Loading configs for type:', configType); // Keep console logs minimal
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

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'description':
          comparison = getDescription(a).localeCompare(getDescription(b));
          break;
        case 'author':
          comparison = (a.metadata?.author || '').localeCompare(b.metadata?.author || '');
          break;
        // NOTE: Add case only if pre-check determined it was missing. Assume added here.
        case 'updated_at':
          const dateA = new Date(a.updated_at || 0).getTime(); // Use direct access
          const dateB = new Date(b.metadata?.updated_at || 0).getTime();
          comparison = dateA - dateB; // Default descending handled later
          break;
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });

    setFilteredConfigs(filtered);
  }, [configs, searchTerm, showArchived, sort]); // Added sort dependency

  // Handle create new config
  const handleCreateNew = () => {
    // console.log('ConfigList: Create new button clicked for type:', configType); // Keep console logs minimal
    if (onCreateNew) {
      // console.log('ConfigList: Using onCreateNew callback'); // Keep console logs minimal
      onCreateNew();
    } else {
      // console.log('ConfigList: Using direct navigation'); // Keep console logs minimal
      handleNavigate(`/configs/${configType}/new`);
    }
  };

  // Handle row click (replaces edit button)
  const handleRowClick = (id: string) => {
    if (onEdit) {
      onEdit(id);
    } else {
      handleNavigate(`/configs/${configType}/${id}`);
    }
  };

  // Handle sort change
  const handleSortChange = (field: SortField) => {
    const isAsc = sort.field === field && sort.direction === 'asc';
    setSort({ field, direction: isAsc ? 'desc' : 'asc' });
  };

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedConfigId(id);
    // console.log(`Menu opened for config: ${id}`); // Keep console logs minimal
  };

  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedConfigId(null);
  };

  // Handle archive/unarchive
  const handleArchiveToggle = async () => {
    if (selectedConfigId) {
      try {
        const configToToggle = configs.find(c => c.id === selectedConfigId);
        const isArchived = configToToggle?.metadata?.archived || false;
        // console.log(`Toggling archive state for ${selectedConfigId} from ${isArchived} to ${!isArchived}`); // Keep console logs minimal

        await archiveConfig(selectedConfigId, !isArchived);
        // console.log(`Archive operation completed for ${selectedConfigId}`); // Keep console logs minimal
        // Force reload configs after archive operation - loadConfigs should trigger useEffect to refilter
        await loadConfigs();

        handleMenuClose();
      } catch (err) {
        console.error(`Archive toggle error:`, err);
        // Optionally: Show error to user via Snackbar/Alert
        handleMenuClose();
      }
    }
  };

  // Modify the handleCloneClick function
  const handleCloneClick = () => {
    if (selectedConfigId) {
      const configToClone = selectedConfigId;
      setNewConfigId(`${configToClone}-copy`);
      setShowCloneDialog(true);
      setCloneSourceId(configToClone); // Save ID for later use
      // console.log(`Showing clone dialog for ${configToClone}`); // Keep console logs minimal
      handleMenuClose();
    }
  };

  // Update handleCloneConfirm to use cloneSourceId instead of selectedConfigId
  const handleCloneConfirm = async () => {
    if (cloneSourceId && newConfigId) { // Use cloneSourceId here instead of selectedConfigId
      try {
        // console.log(`Cloning ${cloneSourceId} to ${newConfigId}`); // Keep console logs minimal
        await cloneConfig(cloneSourceId, newConfigId);
        // console.log(`Clone operation completed`); // Keep console logs minimal
        setShowCloneDialog(false);
        setNewConfigId('');
        setCloneSourceId(null); // Reset after use
        await loadConfigs(); // Refresh list after clone
      } catch (err) {
        console.error(`Clone error:`, err);
        // Optionally: Show error to user
        setShowCloneDialog(false); // Close dialog on error too
        setNewConfigId('');
        setCloneSourceId(null);
      }
    }
  };

  // Handle clone dialog close
  const handleCloneCancel = () => {
    setShowCloneDialog(false);
    setNewConfigId('');
    setCloneSourceId(null); // Reset source ID on cancel
  };

  // Handle delete dialog open
  const handleDeleteClick = () => {
    if (selectedConfigId) {
      // console.log(`Showing delete dialog for ${selectedConfigId}`); // Keep console logs minimal
      setShowDeleteDialog(true);
      handleMenuClose();
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (selectedConfigId) {
      try {
        // console.log(`Deleting ${selectedConfigId}`); // Keep console logs minimal
        await deleteConfig(selectedConfigId);
        // console.log(`Delete operation completed`); // Keep console logs minimal
        setShowDeleteDialog(false);
        // Force reload configs after delete operation
        await loadConfigs();
      } catch (err) {
        console.error(`Delete error:`, err);
        // Optionally: Show error to user
        setShowDeleteDialog(false);
      }
    }
  };

  // Handle delete dialog close
  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  // Handle page change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };
  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
              <TableCell>
                <TableSortLabel
                  active={sort.field === 'id'}
                  direction={sort.field === 'id' ? sort.direction : 'asc'}
                  onClick={() => handleSortChange('id')}
                >
                  ID
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={sort.field === 'description'}
                  direction={sort.field === 'description' ? sort.direction : 'asc'}
                  onClick={() => handleSortChange('description')}
                >
                  Description
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={sort.field === 'author'}
                  direction={sort.field === 'author' ? sort.direction : 'asc'}
                  onClick={() => handleSortChange('author')}
                >
                  Author
                </TableSortLabel>
              </TableCell>

              {/* Added Updated column header */}
              <TableCell>
                <TableSortLabel
                  active={sort.field === 'updated_at'}
                  direction={sort.field === 'updated_at' ? sort.direction : 'asc'}
                  onClick={() => handleSortChange('updated_at')}
                >
                  Updated
                </TableSortLabel>
              </TableCell>

              <TableCell>Options</TableCell>
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
            // Apply pagination to the filtered configs
            filteredConfigs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((config) => (
              <TableRow
                key={config.id}
                hover
                onClick={() => handleRowClick(config.id)} // Click on row navigates
                sx={{ cursor: 'pointer' }}
              >
                <TableCell component="th" scope="row">{config.id}</TableCell>
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
                  {/* Added Updated data cell - Use direct access */}
                  <TimeAgo timestamp={config.updated_at} /> 
                </TableCell>
                <TableCell>
                  {/* Apply stopPropagation to the IconButton's onClick */}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent event from bubbling to TableRow
                      handleMenuOpen(e, config.id);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={filteredConfigs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        />
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
            Are you sure you want to delete this {configName.toLowerCase()}?
            This action cannot be undone.
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