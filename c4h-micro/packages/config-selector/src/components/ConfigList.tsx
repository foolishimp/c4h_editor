import React, { useEffect, useState, useCallback, useMemo } from 'react'; // Ensure all hooks are imported
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
  DialogActions,
  CircularProgress // Added missing import
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

// Props interface
interface ConfigListProps {
  onEdit?: (id: string) => void;
  onCreateNew?: () => void;
}

// Define sort direction type
type SortDirection = 'asc' | 'desc';
// Define sort field type
type SortField = 'id' | 'description' | 'author' | 'updated_at';
// Interface for sort state
interface SortState {
  field: SortField;
  direction: SortDirection;
}

const DEFAULT_ROWS_PER_PAGE = 25;

const ConfigList: React.FC<ConfigListProps> = ({ onEdit, onCreateNew }) => {
  const {
    configType,
    configs, // Raw data from context
    loadConfigs,
    archiveConfig,
    cloneConfig,
    deleteConfig,
    loading,
    error
  } = useConfigContext();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [sort, setSort] = useState<SortState>({ field: 'updated_at', direction: 'desc' });

  // Menu/Dialog State
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [newConfigId, setNewConfigId] = useState('');
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Config name from registry
  const configName = configTypes[configType]?.name || configType;

  // Helper function to get description from config
  const getDescription = useCallback((config: any): string => {
    // Use direct 'title' field from list response, fallback to metadata description or default
    const description = (config?.title?.trim() || config?.metadata?.description?.trim() || '').trim() || 'No description';
    return description;
  }, []);

  // Custom navigation handler (example, adjust if using React Router differently)
  const handleNavigate = (path: string) => {
    // This might need adjustment based on whether Shell uses Router or direct props
    if (window.location.pathname.includes(path)) {
        window.location.reload(); // Reload if already on the path (simple approach)
    } else {
        window.location.href = path; // Navigate otherwise
    }
  };

  // Load configs on mount and when configType changes
  useEffect(() => {
    loadConfigs();
  }, [configType, loadConfigs]);

  // Calculate filtered and sorted configs using useMemo
  const filteredConfigs = useMemo(() => {
    let filtered = configs || [];

    // Filter by archived status - *Correction*: API list should ideally handle this filter server-side if possible.
    // If API doesn't filter, this frontend filter is needed but less efficient.
    // Assuming API *does* support filtering via query param, this frontend filter might be redundant
    // or only needed if showing archived items explicitly. Let's keep it for now.
    filtered = filtered.filter(config =>
      showArchived ? config?.archived === true : config?.archived !== true // Check direct 'archived' field if API returns it
    );

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(config =>
        (config?.id?.toLowerCase() || '').includes(term) ||
        getDescription(config).toLowerCase().includes(term) ||
        (config?.author?.toLowerCase() || '').includes(term) // Also search author
      );
    }

    // Apply sorting
    const sortableFiltered = [...filtered];
    sortableFiltered.sort((a, b) => {
      let comparison = 0;
      const field = sort.field;

      // Helper to get value safely, using direct access for list response fields
      const getValue = (item: any, field: SortField): any => {
          switch (field) {
              case 'id': return item?.id || '';
              case 'description': return getDescription(item); // Uses helper which checks title/metadata.desc
              case 'author': return item?.author || ''; // Use direct access
              case 'updated_at':
                  const dateStr = item?.updated_at; // Use direct access
                  const timestamp = dateStr ? new Date(dateStr).getTime() : 0;
                  return isNaN(timestamp) ? 0 : timestamp;
              default: return '';
          }
      };

      const valueA = getValue(a, field);
      const valueB = getValue(b, field);

      // Perform comparison based on type
      if (typeof valueA === 'number' && typeof valueB === 'number') {
          comparison = valueA - valueB;
      } else if (typeof valueA === 'string' && typeof valueB === 'string') {
          comparison = valueA.localeCompare(valueB);
      } else {
          comparison = String(valueA).localeCompare(String(valueB));
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return sortableFiltered;
  }, [configs, searchTerm, showArchived, sort, getDescription]);

  // --- Handler Function Implementations ---

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      // Fallback or default navigation if prop not provided
      handleNavigate(`/configs/${configType}/new`);
    }
  };

  const handleRowClick = (id: string) => {
    if (onEdit) {
      onEdit(id);
    } else {
      // Fallback or default navigation if prop not provided
      handleNavigate(`/configs/${configType}/${id}`);
    }
  };

  const handleSortChange = (field: SortField) => {
    const isAsc = sort.field === field && sort.direction === 'asc';
    setSort({ field, direction: isAsc ? 'desc' : 'asc' });
    setPage(0); // Reset to first page on sort change
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation(); // Prevent row click when opening menu
    setMenuAnchorEl(event.currentTarget);
    setSelectedConfigId(id);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedConfigId(null);
  };

  const handleArchiveToggle = async () => {
    if (selectedConfigId) {
      const configToToggle = configs.find(c => c.id === selectedConfigId);
      // Use direct 'archived' field if present in list response, fallback to metadata
      const isArchived = configToToggle?.archived ?? configToToggle?.metadata?.archived ?? false;
      const menuAnchor = menuAnchorEl; // Capture anchor before closing
      handleMenuClose(); // Close menu immediately
      try {
        await archiveConfig(selectedConfigId, !isArchived);
        // loadConfigs(); // Context should ideally handle refresh after action
      } catch (err) {
        console.error(`Archive toggle error:`, err);
        // TODO: Show error feedback to user (e.g., Snackbar)
        setMenuAnchorEl(menuAnchor); // Reopen menu on error? Or just log?
        setSelectedConfigId(selectedConfigId);
      }
    }
  };

  const handleCloneClick = () => {
    if (selectedConfigId) {
      setCloneSourceId(selectedConfigId);
      setNewConfigId(`${selectedConfigId}-copy`); // Pre-fill suggestion
      setShowCloneDialog(true);
      handleMenuClose();
    }
  };

  const handleCloneConfirm = async () => {
    if (cloneSourceId && newConfigId && newConfigId.trim()) {
       const sourceId = cloneSourceId; // Capture before resetting state
       const targetId = newConfigId.trim();
       setShowCloneDialog(false);
       setNewConfigId('');
       setCloneSourceId(null);
      try {
        await cloneConfig(sourceId, targetId);
        // loadConfigs(); // Context should ideally handle refresh
      } catch (err) {
        console.error(`Clone error:`, err);
        // TODO: Show error feedback to user
      }
    }
  };

  const handleCloneCancel = () => {
    setShowCloneDialog(false);
    setNewConfigId('');
    setCloneSourceId(null);
  };

  const handleDeleteClick = () => {
    if (selectedConfigId) {
      setShowDeleteDialog(true);
      handleMenuClose();
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedConfigId) {
      const idToDelete = selectedConfigId; // Capture before resetting state
      setShowDeleteDialog(false);
      setSelectedConfigId(null);
      try {
        await deleteConfig(idToDelete);
        // loadConfigs(); // Context should ideally handle refresh
      } catch (err) {
        console.error(`Delete error:`, err);
         // TODO: Show error feedback to user
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSelectedConfigId(null); // Ensure selected ID is cleared
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page on rows per page change
  };

  // --- JSX Rendering ---
  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{configName} List</Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} onClick={loadConfigs} disabled={loading} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateNew}>
            Create New {configName}
          </Button>
        </Box>
      </Box>

      {/* Filter Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField
          placeholder={`Search ${configName.toLowerCase()} (ID, Description, Author)...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ mr: 2, flexGrow: 1 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }}
        />
        <IconButton onClick={() => setShowArchived(!showArchived)} color={showArchived ? "primary" : "default"} title={showArchived ? "Hide archived" : "Show archived"}>
          {showArchived ? <UnarchiveIcon /> : <ArchiveIcon />}
        </IconButton>
      </Box>

      {/* Error Display */}
      {error && (
         <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
           <Typography color="error">{error}</Typography>
         </Box>
      )}

      {/* Table Section */}
      <TableContainer component={Paper}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel active={sort.field === 'id'} direction={sort.field === 'id' ? sort.direction : 'asc'} onClick={() => handleSortChange('id')}>ID</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sort.field === 'description'} direction={sort.field === 'description' ? sort.direction : 'asc'} onClick={() => handleSortChange('description')}>Description</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sort.field === 'author'} direction={sort.field === 'author' ? sort.direction : 'asc'} onClick={() => handleSortChange('author')}>Author</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sort.field === 'updated_at'} direction={sort.field === 'updated_at' ? sort.direction : 'asc'} onClick={() => handleSortChange('updated_at')}>Updated</TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: '50px' }}>Options</TableCell> {/* Fixed width for options */}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (<TableRow><TableCell colSpan={5} align="center"><CircularProgress size={24} /></TableCell></TableRow>)}
            {!loading && error && (<TableRow><TableCell colSpan={5} align="center">Error loading data.</TableCell></TableRow>)}
            {!loading && !error && filteredConfigs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {searchTerm
                    ? `No ${configName.toLowerCase()} found matching your search.`
                    : showArchived
                      ? `No archived ${configName.toLowerCase()} found.`
                      : `No ${configName.toLowerCase()} found. Create one!`}
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && !error && filteredConfigs.length > 0 ? (
              filteredConfigs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((config) => (
                <TableRow key={config.id} hover onClick={() => handleRowClick(config.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell component="th" scope="row">{config.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontStyle: getDescription(config) === 'No description' ? 'italic' : 'normal' }}>
                      {getDescription(config)}
                    </Typography>
                    {/* Tag rendering */}
                    {config.tags && config.tags.length > 0 && ( // Use direct access for tags if API provides it
                      <Box sx={{ mt: 1 }}>
                        {config.tags.map((tag: string) => ( <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }}/> ))}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{config.author}</TableCell> {/* Use direct access */}
                  <TableCell>
                    <TimeAgo timestamp={config.updated_at} /> {/* Use direct access */}
                  </TableCell>
                  <TableCell align="right"> {/* Align options to the right */}
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, config.id)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : null}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]} // Added 10
          component="div"
          count={filteredConfigs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows:" // Shorter label
          sx={{ borderTop: 1, borderColor: 'divider' }} // Add divider
        />
      </TableContainer>

      {/* Dialogs and Menu */}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
         {/* Check if config exists before trying to access metadata */}
        <MenuItem onClick={handleArchiveToggle} disabled={!configs.find(c => c.id === selectedConfigId)}>
          {configs.find(c => c.id === selectedConfigId)?.archived ? 'Unarchive' : 'Archive'}
        </MenuItem>
        <MenuItem onClick={handleCloneClick} disabled={!selectedConfigId}>Clone</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }} disabled={!selectedConfigId}>Delete</MenuItem>
      </Menu>
      {/* Clone Dialog */}
      <Dialog open={showCloneDialog} onClose={handleCloneCancel}>
         <DialogTitle>Clone {configName}</DialogTitle>
         <DialogContent>
           <DialogContentText>Enter a new ID for the cloned {configName.toLowerCase()}.</DialogContentText>
           <TextField autoFocus margin="dense" label={`New ${configName} ID`} fullWidth value={newConfigId} onChange={(e) => setNewConfigId(e.target.value)} variant="standard" />
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
           <DialogContentText>Are you sure you want to delete configuration ID "{selectedConfigId}"? This action cannot be undone.</DialogContentText>
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

