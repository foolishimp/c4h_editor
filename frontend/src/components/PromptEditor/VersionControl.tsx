// File: frontend/src/components/PromptEditor/VersionControl.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Spinner,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useColorModeValue
} from '@chakra-ui/react';
import { usePromptApi } from '../../hooks/usePromptApi';
import { PromptVersion } from '../../types/prompt';
// Import TimeAgo with proper type
import TimeAgo from '../common/TimeAgo';
import DiffViewer from '../common/DiffViewer';

interface VersionControlProps {
  promptId: string;
  currentVersion: string;
  onVersionChange: (version: string) => void;
}

/**
 * Component for viewing and comparing prompt versions
 */
const VersionControl: React.FC<VersionControlProps> = ({
  promptId,
  currentVersion,
  onVersionChange
}) => {
  const { getPromptHistory, getPromptDiff, loading } = usePromptApi();
  const toast = useToast();
  
  // States
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [diffOldContent, setDiffOldContent] = useState<string>('');
  const [diffNewContent, setDiffNewContent] = useState<string>('');
  
  // Modal control
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Colors
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const cardHeaderBg = useColorModeValue('gray.100', 'gray.600');
  const currentBg = useColorModeValue('blue.50', 'blue.900');
  
  // Load versions
  useEffect(() => {
    fetchVersions();
  }, [promptId]);
  
  // Fetch version history
  const fetchVersions = async () => {
    try {
      const history = await getPromptHistory(promptId);
      setVersions(history);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load version history',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Compare versions (show diff)
  const compareVersions = async (fromVersion: string, toVersion: string) => {
    try {
      const diff = await getPromptDiff(promptId, fromVersion, toVersion);
      
      // Extract the content for the diff viewer
      // For simplicity, we'll just use the raw diff text
      setDiffOldContent(diff);
      setDiffNewContent(diff);
      
      onOpen();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to retrieve diff',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Switch to a different version
  const switchToVersion = (version: string) => {
    onVersionChange(version);
  };
  
  return (
    <Box>
      <Heading size="md" mb={4}>Version History</Heading>
      
      <Card bg={cardBg}>
        <CardHeader bg={cardHeaderBg} py={2} px={4}>
          <Flex justify="space-between" align="center">
            <Heading size="sm">Versions</Heading>
            <Button 
              size="xs" 
              colorScheme="blue"
              onClick={fetchVersions}
              isLoading={loading}
            >
              Refresh
            </Button>
          </Flex>
        </CardHeader>
        <CardBody p={0}>
          {loading ? (
            <Flex justify="center" align="center" h="200px">
              <Spinner />
            </Flex>
          ) : versions.length > 0 ? (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Version</Th>
                    <Th>Date</Th>
                    <Th>Author</Th>
                    <Th>Message</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {versions.map((item, index) => (
                    <Tr 
                      key={item.commit_hash}
                      bg={item.commit_hash === currentVersion ? currentBg : undefined}
                    >
                      <Td>
                        <Badge colorScheme="blue">{item.version}</Badge>
                        {index === 0 && (
                          <Badge ml={2} colorScheme="green">Latest</Badge>
                        )}
                      </Td>
                      <Td>
                        <TimeAgo 
                          date={item.created_at} 
                          tooltipFormat={true} 
                          fontSize="xs"
                        />
                      </Td>
                      <Td>{item.author}</Td>
                      <Td>{item.message}</Td>
                      <Td>
                        <Flex>
                          {item.commit_hash !== currentVersion && (
                            <Button
                              size="xs"
                              variant="outline"
                              colorScheme="blue"
                              onClick={() => switchToVersion(item.commit_hash)}
                            >
                              Switch
                            </Button>
                          )}
                          
                          {index < versions.length - 1 && (
                            <Button
                              size="xs"
                              ml={2}
                              onClick={() => compareVersions(
                                versions[index + 1].commit_hash, 
                                item.commit_hash
                              )}
                            >
                              Compare
                            </Button>
                          )}
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          ) : (
            <Text p={4} color="gray.500">No version history available.</Text>
          )}
        </CardBody>
      </Card>
      
      {/* Diff Viewer Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Version Comparison</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <DiffViewer 
              oldContent={diffOldContent}
              newContent={diffNewContent}
              splitView={true}
              title="Changes Between Versions"
            />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default VersionControl;