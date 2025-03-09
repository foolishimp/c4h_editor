// File: frontend/src/components/PromptEditor/MetadataPanel.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Textarea,
  Heading,
  Tag,
  TagLabel,
  TagCloseButton,
  HStack,
  VStack,
  useColorModeValue,
  Flex,
  Text,
  Card,
  CardHeader,
  CardBody,
  InputGroup,
  InputRightElement,
  Select
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { PromptMetadata } from '../../types/prompt';

interface MetadataPanelProps {
  metadata: PromptMetadata;
  onChange: (metadata: PromptMetadata) => void;
  readOnly?: boolean;
}

/**
 * Panel for editing prompt metadata
 */
const MetadataPanel: React.FC<MetadataPanelProps> = ({
  metadata,
  onChange,
  readOnly = false
}) => {
  const [newTag, setNewTag] = useState<string>('');
  
  // Colors for styling
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const cardHeaderBg = useColorModeValue('gray.100', 'gray.600');
  
  // Update a specific metadata field
  const updateField = (field: keyof PromptMetadata, value: any) => {
    onChange({
      ...metadata,
      [field]: value
    });
  };
  
  // Add a new tag
  const addTag = () => {
    if (!newTag.trim()) return;
    if (metadata.tags.includes(newTag.trim())) return;
    
    updateField('tags', [...metadata.tags, newTag.trim()]);
    setNewTag('');
  };
  
  // Remove a tag
  const removeTag = (tag: string) => {
    updateField('tags', metadata.tags.filter(t => t !== tag));
  };
  
  // Handle Enter key press to add tag
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };
  
  return (
    <Box>
      <Heading size="md" mb={4}>Metadata</Heading>
      
      <Card bg={cardBg} mb={4}>
        <CardHeader bg={cardHeaderBg} py={2} px={4}>
          <Heading size="sm">Basic Information</Heading>
        </CardHeader>
        <CardBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Author</FormLabel>
              <Input
                value={metadata.author}
                onChange={(e) => updateField('author', e.target.value)}
                readOnly={readOnly}
                placeholder="Author name"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={metadata.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                readOnly={readOnly}
                placeholder="Description of this prompt's purpose and usage"
                rows={3}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Target Model</FormLabel>
              <Select
                value={metadata.target_model || ''}
                onChange={(e) => updateField('target_model', e.target.value)}
                isDisabled={readOnly}
              >
                <option value="">Any model</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </Select>
            </FormControl>
          </Stack>
        </CardBody>
      </Card>
      
      <Card bg={cardBg}>
        <CardHeader bg={cardHeaderBg} py={2} px={4}>
          <Heading size="sm">Tags</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Box>
              <HStack spacing={2} flexWrap="wrap">
                {metadata.tags.length > 0 ? (
                  metadata.tags.map((tag) => (
                    <Tag
                      key={tag}
                      size="md"
                      colorScheme="blue"
                      borderRadius="full"
                      m={1}
                    >
                      <TagLabel>{tag}</TagLabel>
                      {!readOnly && (
                        <TagCloseButton onClick={() => removeTag(tag)} />
                      )}
                    </Tag>
                  ))
                ) : (
                  <Text color="gray.500">No tags added yet</Text>
                )}
              </HStack>
            </Box>
            
            {!readOnly && (
              <Box>
                <InputGroup size="md">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <InputRightElement width="4.5rem">
                    <Button 
                      h="1.75rem" 
                      size="sm" 
                      colorScheme="blue"
                      onClick={addTag}
                      isDisabled={!newTag.trim()}
                    >
                      <AddIcon />
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </Box>
            )}
            
            {/* Version info (read-only) */}
            <Flex justifyContent="space-between" fontSize="sm" color="gray.500">
              <Text>Version: {metadata.version}</Text>
              <Text>
                {metadata.updated_at ? `Updated: ${new Date(metadata.updated_at).toLocaleDateString()}` : ''}
              </Text>
            </Flex>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default MetadataPanel;