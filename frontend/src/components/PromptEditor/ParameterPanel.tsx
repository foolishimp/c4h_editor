// File: frontend/src/components/PromptEditor/ParameterPanel.tsx

import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  FormControl, 
  FormLabel, 
  Input, 
  Stack, 
  Select, 
  Switch, 
  Textarea, 
  Heading, 
  IconButton, 
  Badge, 
  Text,
  Card,
  CardHeader,
  CardBody,
  Flex,
  Tooltip,
  FormHelperText,
  useColorModeValue,
  HStack,
  VStack
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, RepeatIcon } from '@chakra-ui/icons';
import { PromptParameter } from '../../types/prompt';

type ParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface ParameterPanelProps {
  parameters: PromptParameter[];
  onChange: (parameters: PromptParameter[]) => void;
}

/**
 * Panel for editing prompt parameters
 */
const ParameterPanel: React.FC<ParameterPanelProps> = ({
  parameters,
  onChange
}) => {
  const [newParameter, setNewParameter] = useState<PromptParameter>({
    name: '',
    type: 'string',
    description: '',
    required: true
  });

  // Background colors for parameter cards
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const cardHeaderBg = useColorModeValue('gray.100', 'gray.600');

  // Handle parameter update
  const updateParameter = (index: number, field: keyof PromptParameter, value: any) => {
    const updatedParams = [...parameters];
    updatedParams[index] = {
      ...updatedParams[index],
      [field]: value
    };
    onChange(updatedParams);
  };

  // Add a new parameter
  const addParameter = () => {
    if (!newParameter.name.trim()) return;
    
    // Validate parameter name is unique
    if (parameters.some(p => p.name === newParameter.name.trim())) {
      alert('Parameter name must be unique');
      return;
    }
    
    // Validate parameter name format (valid JS identifier)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newParameter.name.trim())) {
      alert('Parameter name must be a valid identifier (letters, numbers, underscore, not starting with a number)');
      return;
    }
    
    onChange([...parameters, { ...newParameter }]);
    
    // Reset new parameter form
    setNewParameter({
      name: '',
      type: 'string',
      description: '',
      required: true
    });
  };

  // Delete a parameter
  const deleteParameter = (index: number) => {
    const updatedParams = [...parameters];
    updatedParams.splice(index, 1);
    onChange(updatedParams);
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Parameters</Heading>
      
      {/* Existing parameters */}
      <VStack spacing={4} align="stretch" mb={6}>
        {parameters.map((param, index) => (
          <Card key={index} bg={cardBg} size="sm">
            <CardHeader bg={cardHeaderBg} py={2} px={4}>
              <Flex justify="space-between" align="center">
                <HStack>
                  <Text fontWeight="bold">{param.name}</Text>
                  <Badge colorScheme={getTypeColor(param.type)}>{param.type}</Badge>
                  {param.required && <Badge colorScheme="red">required</Badge>}
                </HStack>
                <IconButton
                  aria-label="Delete parameter"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => deleteParameter(index)}
                />
              </Flex>
            </CardHeader>
            <CardBody py={3} px={4}>
              <Stack spacing={3}>
                <FormControl>
                  <FormLabel fontSize="sm">Name</FormLabel>
                  <Input 
                    size="sm"
                    value={param.name}
                    onChange={(e) => updateParameter(index, 'name', e.target.value)}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel fontSize="sm">Type</FormLabel>
                  <Select 
                    size="sm"
                    value={param.type}
                    onChange={(e) => updateParameter(index, 'type', e.target.value as ParameterType)}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="array">Array</option>
                    <option value="object">Object</option>
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel fontSize="sm">Description</FormLabel>
                  <Textarea 
                    size="sm"
                    value={param.description || ''}
                    onChange={(e) => updateParameter(index, 'description', e.target.value)}
                    placeholder="Describe the parameter..."
                  />
                </FormControl>
                
                <FormControl display="flex" alignItems="center">
                  <FormLabel fontSize="sm" mb={0}>Required</FormLabel>
                  <Switch 
                    isChecked={param.required}
                    onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel fontSize="sm">Default Value (optional)</FormLabel>
                  {param.type === 'string' && (
                    <Input 
                      size="sm"
                      value={param.default || ''}
                      onChange={(e) => updateParameter(index, 'default', e.target.value)}
                      placeholder="Default value"
                    />
                  )}
                  {param.type === 'number' && (
                    <Input 
                      size="sm"
                      type="number"
                      value={param.default !== undefined ? param.default : ''}
                      onChange={(e) => updateParameter(index, 'default', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Default value"
                    />
                  )}
                  {param.type === 'boolean' && (
                    <Select
                      size="sm"
                      value={param.default !== undefined ? String(param.default) : ''}
                      onChange={(e) => updateParameter(index, 'default', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}
                    >
                      <option value="">No default</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </Select>
                  )}
                  {(param.type === 'array' || param.type === 'object') && (
                    <Textarea 
                      size="sm"
                      value={param.default !== undefined ? JSON.stringify(param.default, null, 2) : ''}
                      onChange={(e) => {
                        try {
                          const value = e.target.value ? JSON.parse(e.target.value) : undefined;
                          updateParameter(index, 'default', value);
                        } catch (err) {
                          // Don't update if invalid JSON
                        }
                      }}
                      placeholder="Default value as JSON"
                    />
                  )}
                </FormControl>
              </Stack>
            </CardBody>
          </Card>
        ))}
        
        {parameters.length === 0 && (
          <Text color="gray.500" textAlign="center" py={4}>
            No parameters defined yet. Add your first parameter below.
          </Text>
        )}
      </VStack>
      
      {/* Add new parameter form */}
      <Card bg={cardBg}>
        <CardHeader bg={cardHeaderBg} py={2} px={4}>
          <Heading size="sm">Add New Parameter</Heading>
        </CardHeader>
        <CardBody>
          <Stack spacing={3}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Name</FormLabel>
              <Input 
                size="sm"
                value={newParameter.name}
                onChange={(e) => setNewParameter({...newParameter, name: e.target.value})}
                placeholder="Parameter name"
              />
              <FormHelperText>Must be a valid identifier</FormHelperText>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Type</FormLabel>
              <Select 
                size="sm"
                value={newParameter.type}
                onChange={(e) => setNewParameter({
                  ...newParameter, 
                  type: e.target.value as ParameterType
                })}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
                <option value="object">Object</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Description</FormLabel>
              <Textarea 
                size="sm"
                value={newParameter.description || ''}
                onChange={(e) => setNewParameter({...newParameter, description: e.target.value})}
                placeholder="Describe the parameter..."
              />
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel fontSize="sm" mb={0}>Required</FormLabel>
              <Switch 
                isChecked={newParameter.required}
                onChange={(e) => setNewParameter({...newParameter, required: e.target.checked})}
              />
            </FormControl>
            
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              size="sm"
              onClick={addParameter}
              isDisabled={!newParameter.name.trim()}
            >
              Add Parameter
            </Button>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
};

// Helper function to get color scheme based on parameter type
function getTypeColor(type: string): string {
  switch (type) {
    case 'string': return 'blue';
    case 'number': return 'green';
    case 'boolean': return 'purple';
    case 'array': return 'orange';
    case 'object': return 'teal';
    default: return 'gray';
  }
}

export default ParameterPanel;