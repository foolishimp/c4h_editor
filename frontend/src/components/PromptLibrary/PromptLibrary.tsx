// File: frontend/src/components/PromptLibrary/PromptLibrary.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Badge,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useColorModeValue,
  FormControl,
  FormLabel
} from '@chakra-ui/react';
import {
  SearchIcon,
  AddIcon,
  SettingsIcon,
  DeleteIcon,
  CopyIcon,
  EditIcon
} from '@chakra-ui/icons';
import { usePromptApi } from '../../hooks/usePromptApi';
import { PromptListItem } from '../../types/prompt';
import TimeAgo from '../common/TimeAgo';
// Import as default components
import PromptEditor from '../PromptEditor/PromptEditor';

interface PromptLibraryProps {
  onPromptSelect?: (promptId: string) => void;
}

/**
 * Library component for browsing and managing prompts
 */
const PromptLibrary: React.FC<PromptLibraryProps> = ({
  onPromptSelect
}) => {
  // State
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<PromptListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [newPromptId, setNewPromptId] = useState<string>('');
  const [newPromptAuthor, setNewPromptAuthor] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Modal controls
  const { 
    isOpen: isCreateModalOpen, 
    onOpen: onCreateModalOpen, 
    onClose: onCreateModalClose 
  } = useDisclosure();
  
  const { 
    isOpen: isDeleteModalOpen, 
    onOpen: onDeleteModalOpen, 
    onClose: onDeleteModalClose 
  } = useDisclosure();
  
  const { 
    isOpen: isCloneModalOpen, 
    onOpen: onCloneModalOpen, 
    onClose: onCloneModalClose 
  } = useDisclosure();
  
  // API hooks
  const { 
    loading, 
    getPrompts, 
    deletePrompt, 
    createPrompt, 
    clonePrompt 
  } = usePromptApi();
  
  // Load prompts
  useEffect(() => {
    fetchPrompts();
  }, []);
  
  // Filter prompts when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPrompts(prompts);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = prompts.filter(prompt => 
      prompt.id.toLowerCase().includes(query) ||
      prompt.title.toLowerCase().includes(query) ||
      prompt.author.toLowerCase().includes(query)
    );
    
    setFilteredPrompts(filtered);
  }, [searchQuery, prompts]);
  
  // Fetch prompts from API
  const fetchPrompts = async () => {
    try {
      const data = await getPrompts();
      setPrompts(data);
      setFilteredPrompts(data);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };
  
  // Select a prompt
  const handlePromptSelect = (promptId: string) => {
    setSelectedPrompt(promptId);
    if (onPromptSelect) {
      onPromptSelect(promptId);
    }
    setIsEditing(true);
  };
  
  // Create a new prompt
  const handleCreatePrompt = async () => {
    if (!newPromptId || !newPromptAuthor) return;
    
    try {
      const data = {
        id: newPromptId,
        template: {
          text: "# Prompt Template\n\nYour prompt content here...",
          parameters: [],
          config: {
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop_sequences: []
          }
        },
        metadata: {
          author: newPromptAuthor,
          description: "",
          tags: [],
          version: "1.0.0",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        commit_message: `Created new prompt: ${newPromptId}`,
        author: newPromptAuthor
      };
      
      await createPrompt(data);
      onCreateModalClose();
      setNewPromptId('');
      setNewPromptAuthor('');
      fetchPrompts();
      
      // Select the newly created prompt
      setSelectedPrompt(newPromptId);
      if (onPromptSelect) {
        onPromptSelect(newPromptId);
      }
      setIsEditing(true);
    } catch (error) {
      console.error('Error creating prompt:', error);
    }
  };
  
  // Delete a prompt
  const handleDeletePrompt = async (promptId: string) => {
    try {
      await deletePrompt(
        promptId, 
        `Deleted prompt: ${promptId}`, 
        'System'
      );
      onDeleteModalClose();
      fetchPrompts();
      
      // Deselect the prompt if it was selected
      if (selectedPrompt === promptId) {
        setSelectedPrompt(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
    }
  };
  
  // Clone a prompt
  const handleClonePrompt = async (sourceId: string, newId: string) => {
    if (!newId || !sourceId) return;
    
    try {
      await clonePrompt(sourceId, newId, newPromptAuthor || 'System');
      onCloneModalClose();
      setNewPromptId('');
      fetchPrompts();
      
      // Select the newly cloned prompt
      setSelectedPrompt(newId);
      if (onPromptSelect) {
        onPromptSelect(newId);
      }
      setIsEditing(true);
    } catch (error) {
      console.error('Error cloning prompt:', error);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Reset edit mode
  const handleBackToLibrary = () => {
    setIsEditing(false);
  };
  
  // Background colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');
  const selectedBgColor = useColorModeValue('blue.50', 'blue.900');
  
  // If in editing mode, show the prompt editor
  if (isEditing && selectedPrompt) {
    return (
      <Box>
        <Button 
          leftIcon={<ArrowBackIcon />} 
          mb={4} 
          onClick={handleBackToLibrary}
        >
          Back to Library
        </Button>
        <PromptEditor 
          promptId={selectedPrompt} 
          onSave={() => fetchPrompts()} 
        />
      </Box>
    );
  }
  
  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">Prompt Library</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={onCreateModalOpen}
        >
          New Prompt
        </Button>
      </Flex>
      
      <InputGroup mb={4}>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.300" />
        </InputLeftElement>
        <Input
          placeholder="Search prompts..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </InputGroup>
      
      <Box borderWidth="1px" borderRadius="md" overflow="hidden">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Title</Th>
              <Th>Author</Th>
              <Th>Updated</Th>
              <Th>Version</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredPrompts.map((prompt) => (
              <Tr
                key={prompt.id}
                bg={selectedPrompt === prompt.id ? selectedBgColor : bgColor}
                _hover={{ bg: hoverBgColor }}
                cursor="pointer"
                onClick={() => handlePromptSelect(prompt.id)}
              >
                <Td fontWeight="medium">{prompt.id}</Td>
                <Td>{prompt.title}</Td>
                <Td>{prompt.author}</Td>
                <Td>
                  <TimeAgo date={prompt.updated_at} />
                </Td>
                <Td>
                  <Badge colorScheme="blue">{prompt.version}</Badge>
                </Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<SettingsIcon />}
                      variant="ghost"
                      size="sm"
                    />
                    <MenuList>
                      <MenuItem 
                        icon={<EditIcon />}
                        onClick={() => handlePromptSelect(prompt.id)}
                      >
                        Edit
                      </MenuItem>
                      <MenuItem 
                        icon={<CopyIcon />}
                        onClick={() => {
                          setSelectedPrompt(prompt.id);
                          setNewPromptId(`${prompt.id}_copy`);
                          onCloneModalOpen();
                        }}
                      >
                        Clone
                      </MenuItem>
                      <MenuItem 
                        icon={<DeleteIcon />}
                        color="red.500"
                        onClick={() => {
                          setSelectedPrompt(prompt.id);
                          onDeleteModalOpen();
                        }}
                      >
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))}
            
            {filteredPrompts.length === 0 && (
              <Tr>
                <Td colSpan={6} textAlign="center" py={4}>
                  {loading ? (
                    <Text>Loading prompts...</Text>
                  ) : (
                    <Text>
                      {searchQuery
                        ? `No prompts matching "${searchQuery}"`
                        : "No prompts found. Create your first prompt!"}
                    </Text>
                  )}
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
      
      {/* Create Prompt Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={onCreateModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Prompt</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired mb={4}>
              <FormLabel>Prompt ID</FormLabel>
              <Input
                placeholder="my_prompt_id"
                value={newPromptId}
                onChange={(e) => setNewPromptId(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Author</FormLabel>
              <Input
                placeholder="Your Name"
                value={newPromptAuthor}
                onChange={(e) => setNewPromptAuthor(e.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreatePrompt}
              isDisabled={!newPromptId || !newPromptAuthor}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Prompt</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to delete prompt "{selectedPrompt}"? This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => selectedPrompt && handleDeletePrompt(selectedPrompt)}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Clone Prompt Modal */}
      <Modal isOpen={isCloneModalOpen} onClose={onCloneModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Clone Prompt</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired mb={4}>
              <FormLabel>New Prompt ID</FormLabel>
              <Input
                placeholder="cloned_prompt_id"
                value={newPromptId}
                onChange={(e) => setNewPromptId(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Author</FormLabel>
              <Input
                placeholder="Your Name"
                value={newPromptAuthor}
                onChange={(e) => setNewPromptAuthor(e.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCloneModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => selectedPrompt && handleClonePrompt(selectedPrompt, newPromptId)}
              isDisabled={!newPromptId || !newPromptAuthor}
            >
              Clone
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

// Missing import for ArrowBackIcon
import { ArrowBackIcon } from '@chakra-ui/icons';

export default PromptLibrary;