import { useState, useEffect } from 'react';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { WorkOrderParameter, ParameterType } from '../../types/workorder';

interface WorkOrderParameterPanelProps {
  parameters: WorkOrderParameter[];
  onChange: (parameters: WorkOrderParameter[]) => void;
  readOnly?: boolean;
}

export const WorkOrderParameterPanel = ({ parameters, onChange, readOnly = false }: WorkOrderParameterPanelProps) => {
  const [localParameters, setLocalParameters] = useState<WorkOrderParameter[]>(parameters);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentParameter, setCurrentParameter] = useState<WorkOrderParameter | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalParameters(parameters);
  }, [parameters]);

  const handleOpenAdd = () => {
    setCurrentParameter({
      name: '',
      description: '',
      type: ParameterType.STRING,
      required: false,
      default: ''
    });
    setEditIndex(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (index: number) => {
    setCurrentParameter(localParameters[index]);
    setEditIndex(index);
    setOpenDialog(true);
  };

  const handleDelete = (index: number) => {
    if (readOnly) return;
    
    const updatedParameters = [...localParameters];
    updatedParameters.splice(index, 1);
    setLocalParameters(updatedParameters);
    onChange(updatedParameters);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setCurrentParameter(null);
    setEditIndex(null);
  };

  const handleParameterChange = (field: keyof WorkOrderParameter, value: any) => {
    if (!currentParameter) return;
    
    const updatedParameter = {
      ...currentParameter,
      [field]: value
    };
    setCurrentParameter(updatedParameter);
  };

  const handleSaveParameter = () => {
    if (!currentParameter || readOnly) return;
    
    const updatedParameters = [...localParameters];
    
    if (editIndex !== null) {
      updatedParameters[editIndex] = currentParameter;
    } else {
      updatedParameters.push(currentParameter);
    }
    
    setLocalParameters(updatedParameters);
    onChange(updatedParameters);
    handleDialogClose();
  };

  return (
    <Box className="parameter-panel">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Parameters</Typography>
        {!readOnly && (
          <Button
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            variant="contained"
            size="small"
          >
            Add Parameter
          </Button>
        )}
      </Box>
      
      <List>
        {localParameters.map((param, index) => (
          <ListItem 
            key={index} 
            button 
            onClick={() => handleOpenEdit(index)}
            disabled={readOnly}
          >
            <ListItemText 
              primary={param.name} 
              secondary={
                <>
                  <Typography component="span" variant="body2" color="textPrimary">
                    {param.type} {param.required ? '(Required)' : '(Optional)'}
                  </Typography>
                  <Typography component="span" variant="body2" display="block">
                    {param.description}
                  </Typography>
                </>
              } 
            />
            {!readOnly && (
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  aria-label="delete" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(index);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
      </List>
      
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editIndex !== null ? 'Edit Parameter' : 'Add Parameter'}
        </DialogTitle>
        <DialogContent>
          {currentParameter && (
            <Box>
              <TextField
                label="Name"
                value={currentParameter.name}
                onChange={(e) => handleParameterChange('name', e.target.value)}
                fullWidth
                margin="normal"
                required
              />
              
              <TextField
                label="Description"
                value={currentParameter.description}
                onChange={(e) => handleParameterChange('description', e.target.value)}
                fullWidth
                margin="normal"
                multiline
                rows={2}
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="parameter-type-label">Type</InputLabel>
                <Select
                  labelId="parameter-type-label"
                  value={currentParameter.type}
                  onChange={(e) => handleParameterChange('type', e.target.value)}
                  label="Type"
                >
                  <MenuItem value={ParameterType.STRING}>String</MenuItem>
                  <MenuItem value={ParameterType.NUMBER}>Number</MenuItem>
                  <MenuItem value={ParameterType.BOOLEAN}>Boolean</MenuItem>
                  <MenuItem value={ParameterType.ARRAY}>Array</MenuItem>
                  <MenuItem value={ParameterType.OBJECT}>Object</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="parameter-required-label">Required</InputLabel>
                <Select
                  labelId="parameter-required-label"
                  value={currentParameter.required}
                  onChange={(e) => handleParameterChange('required', e.target.value)}
                  label="Required"
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Default Value"
                value={currentParameter.default || ''}
                onChange={(e) => handleParameterChange('default', e.target.value)}
                fullWidth
                margin="normal"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSaveParameter} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};