// File: frontend/src/components/WorkOrderList/WorkOrderList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Tooltip,
  Menu,
  MenuItem,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import TimeAgo from '../common/TimeAgo';
import { WorkOrder } from '../../types/workorder';
import { useWorkOrderApi } from '../../hooks/useWorkOrderApi';

// New component for work order list filtering
const WorkOrderFilters: React.FC<{
  showArchived: boolean;
  onToggleArchived: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}> = ({
  showArchived,
  onToggleArchived,
  searchTerm,
  onSearchChange
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <TextField
        placeholder="Search work orders..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
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
      <Tooltip title={showArchived ? "Hide archived" : "Show archived"}>
        <IconButton onClick={onToggleArchived} color={showArchived ? "primary" : "default"}>
          {showArchived ? <UnarchiveIcon /> : <ArchiveIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export const WorkOrderList: React.FC = () => {
  const navigate = useNavigate();
  const {
    workOrders,
    fetchWorkOrders,
    archiveWorkOrder,
    unarchiveWorkOrder,
    cloneWorkOrder,
    loading,
    error
  } = useWorkOrderApi();

  // State for work order management
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  
  // State for actions and dialogs
  const [activeWorkOrderId, setActiveWorkOrderId] = useState<string | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [newWorkOrderId, setNewWorkOrderId] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Load work orders on component mount
  useEffect(() => {
    fetchWorkOrders();
  }, []);

  // Filter work orders based on search term and archived status
  useEffect(() => {
    if (!workOrders || !Array.isArray(workOrders)) {
      setFilteredWorkOrders([]);
      return;
    }

    let filtered = [...workOrders];
    
    // Filter by archived status - safely check for undefined
    filtered = filtered.filter(wo => {
      const isArchived = wo.metadata?.archived === true;
      return showArchived ? isArchived : !isArchived;
    });
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(wo => 
        wo.id.toLowerCase().includes(term) ||
        (wo.metadata?.description && wo.metadata.description.toLowerCase().includes(term)) ||
        (wo.metadata?.goal && wo.metadata.goal.toLowerCase().includes(term))
      );
    }
    
    setFilteredWorkOrders(filtered);
    setPage(1); // Reset to first page when filters change
  }, [workOrders, searchTerm, showArchived]);

  // Pagination logic
  const paginatedWorkOrders = filteredWorkOrders.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
  
  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  // Action handlers
  const handleCreateNew = () => {
    navigate('/workorders/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/workorders/${id}`);
  };

  const handleArchiveToggle = async (id: string, isArchived: boolean) => {
    try {
      if (isArchived) {
        await unarchiveWorkOrder(id);
      } else {
        await archiveWorkOrder(id);
      }
      await fetchWorkOrders();
    } catch (err) {
      console.error('Error toggling archive status:', err);
    }
  };

  const handleCloneClick = (id: string) => {
    setActiveWorkOrderId(id);
    setNewWorkOrderId(`${id}-copy`);
    setShowCloneDialog(true);
  };

  const handleClone = async () => {
    if (!activeWorkOrderId || !newWorkOrderId) return;
    
    try {
      await cloneWorkOrder(activeWorkOrderId, newWorkOrderId);
      setShowCloneDialog(false);
      setActiveWorkOrderId(null);
      setNewWorkOrderId('');
      await fetchWorkOrders();
    } catch (err) {
      console.error('Error cloning work order:', err);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setActiveWorkOrderId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActiveWorkOrderId(null);
  };

  // Priority color mapping
  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // Safely find a work order
  const findWorkOrder = (id: string | null) => {
    if (!id || !workOrders || !Array.isArray(workOrders)) return null;
    return workOrders.find(wo => wo.id === id) || null;
  };

  // Check if a work order is archived
  const isWorkOrderArchived = (id: string | null) => {
    const workOrder = findWorkOrder(id);
    return workOrder?.metadata?.archived === true;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Work Orders</Typography>
        <Box>
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={() => fetchWorkOrders()}
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
            Create New
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <WorkOrderFilters
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Error message */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          Error loading work orders: {error.message}
        </Typography>
      )}

      {/* Work Orders table */}
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && paginatedWorkOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading work orders...</TableCell>
              </TableRow>
            ) : paginatedWorkOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {searchTerm 
                    ? 'No work orders found matching your search.' 
                    : showArchived 
                      ? 'No archived work orders found.' 
                      : 'No active work orders found. Create your first work order!'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedWorkOrders.map((workOrder) => (
                <TableRow key={workOrder.id}>
                  <TableCell>{workOrder.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {workOrder.metadata?.description || 'No description'}
                    </Typography>
                    {workOrder.metadata?.goal && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Goal: {workOrder.metadata.goal}
                      </Typography>
                    )}
                    {workOrder.metadata?.tags && workOrder.metadata.tags.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {workOrder.metadata.tags.slice(0, 3).map((tag) => (
                          <Chip 
                            key={tag} 
                            label={tag} 
                            size="small" 
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                        {workOrder.metadata.tags.length > 3 && (
                          <Chip 
                            label={`+${workOrder.metadata.tags.length - 3}`} 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {workOrder.metadata?.priority && (
                      <Chip 
                        label={workOrder.metadata.priority} 
                        color={getPriorityColor(workOrder.metadata.priority)}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>{workOrder.metadata?.author}</TableCell>
                  <TableCell>
                    <TimeAgo timestamp={workOrder.metadata?.updated_at} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleEdit(workOrder.id)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, workOrder.id)}
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
      
      {/* Pagination */}
      {filteredWorkOrders.length > rowsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={Math.ceil(filteredWorkOrders.length / rowsPerPage)}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
      
      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (activeWorkOrderId) {
            handleArchiveToggle(activeWorkOrderId, isWorkOrderArchived(activeWorkOrderId));
          }
          handleMenuClose();
        }}>
          {isWorkOrderArchived(activeWorkOrderId) ? 'Unarchive' : 'Archive'}
        </MenuItem>
        <MenuItem onClick={() => {
          if (activeWorkOrderId) {
            handleCloneClick(activeWorkOrderId);
          }
          handleMenuClose();
        }}>
          Clone
        </MenuItem>
      </Menu>
      
      {/* Clone Dialog */}
      <Dialog open={showCloneDialog} onClose={() => setShowCloneDialog(false)}>
        <DialogTitle>Clone Work Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a new ID for the cloned work order.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="New Work Order ID"
            fullWidth
            value={newWorkOrderId}
            onChange={(e) => setNewWorkOrderId(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCloneDialog(false)}>Cancel</Button>
          <Button onClick={handleClone} disabled={!newWorkOrderId.trim()}>Clone</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkOrderList;