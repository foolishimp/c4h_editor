// File: frontend/src/components/PromptEditor/PromptEditor.tsx

import React, { useState, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Prompt, PromptMetadata, PromptTemplate, PromptConfig, PromptParameter } from '../../types/prompt';
import { Box, Button, Flex, Grid, GridItem, Heading, Spinner, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useColorMode, useToast } from '@chakra-ui/react';
import { usePromptApi } from '../../hooks/usePromptApi';
import MetadataPanel from './MetadataPanel';
import ParameterPanel from './ParameterPanel';
import TestRunner from './TestRunner';
import VersionControl from './VersionControl';

interface PromptEditorProps {
  promptId: string;
  onSave?: (prompt: Prompt) => void;
}

/**
 * Main editor component for creating and editing prompts
 */
const PromptEditor: React.FC<PromptEditorProps> = ({
  promptId,
  onSave
}) => {
  // Editor state
  const [content, setContent] = useState<string>('');
  const [metadata, setMetadata] = useState<PromptMetadata>({
    author: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: [],
    version: '1.0.0'
  });
  const [parameters, setParameters] = useState<PromptParameter[]>([]);
  const [config, setConfig] = useState<PromptConfig>({
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stop_sequences: []
  });
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  
  const editorRef = useRef<any>(null);
  const { colorMode } = useColorMode();
  const toast = useToast();
  
  // API hooks
  const { 
    loading, 
    getPrompt, 
    updatePrompt 
  } = usePromptApi();
  
  // Initial load of prompt
  useEffect(() => {
    loadPrompt();
  }, [promptId]);
  
  const loadPrompt = async () => {
    if (!promptId) return;
    
    try {
      const data = await getPrompt(promptId);
      
      // Update state with loaded prompt
      setPrompt(data);
      setContent(data.template.text);
      setMetadata(data.metadata);
      setParameters(data.template.parameters);
      setConfig(data.template.config);
      setCurrentVersion(data.metadata.version);
      setIsDirty(false);
    } catch (error) {
      toast({
        title: 'Error loading prompt',
        description: error instanceof Error ? error.message : 'Failed to load prompt',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Handle editor mount
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };
  
  // Handle content change
  const handleContentChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setIsDirty(true);
    }
  };
  
  // Handle metadata update
  const handleMetadataUpdate = (updatedMetadata: PromptMetadata) => {
    setMetadata(updatedMetadata);
    setIsDirty(true);
  };
  
  // Handle parameters update
  const handleParametersUpdate = (updatedParameters: PromptParameter[]) => {
    setParameters(updatedParameters);
    setIsDirty(true);
  };
  
  // Handle version change
  const handleVersionChange = (version: string) => {
    if (isDirty) {
      // Confirm switch if there are unsaved changes
      if (!window.confirm("You have unsaved changes. Do you want to switch versions and lose your changes?")) {
        return;
      }
    }
    
    // Load the specified version
    getPrompt(promptId, version)
      .then(data => {
        setPrompt(data);
        setContent(data.template.text);
        setMetadata(data.metadata);
        setParameters(data.template.parameters);
        setConfig(data.template.config);
        setCurrentVersion(version);
        setIsDirty(false);
      })
      .catch(err => {
        toast({
          title: 'Error loading version',
          description: err instanceof Error ? err.message : 'Failed to load version',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
  };
  
  // Save prompt
  const savePrompt = async () => {
    if (!prompt) return;
    
    try {
      // Create updated prompt object
      const updatedPrompt: Prompt = {
        ...prompt,
        template: {
          text: content,
          parameters: parameters,
          config: config
        },
        metadata: {
          ...metadata,
          updated_at: new Date().toISOString()
        }
      };
      
      // Prepare update request
      const updateData = {
        template: updatedPrompt.template,
        metadata: updatedPrompt.metadata,
        commit_message: `Updated prompt ${promptId}`,
        author: metadata.author || 'Unknown'
      };
      
      // Call API to update prompt
      const result = await updatePrompt(promptId, updateData);
      
      // Update local state with result
      setPrompt(result);
      setCurrentVersion(result.metadata.version);
      setIsDirty(false);
      
      // Call onSave callback if provided
      if (onSave) {
        onSave(result);
      }
      
      toast({
        title: 'Prompt saved',
        description: `Prompt ${promptId} saved successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error saving prompt',
        description: error instanceof Error ? error.message : 'Failed to save prompt',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Check for parameter references in content
  const validateParameters = (): string[] => {
    const errors: string[] = [];
    const parameterNames = parameters.map(p => p.name);
    
    // Check for parameters referenced in text but not defined
    const paramPattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const matches = [...content.matchAll(paramPattern)];
    const referencedParams = matches.map(m => m[1]);
    
    // Find unique referenced parameters not in defined parameters
    const uniqueRefs = [...new Set(referencedParams)];
    const missingParams = uniqueRefs.filter(ref => !parameterNames.includes(ref));
    
    if (missingParams.length > 0) {
      errors.push(`Referenced parameters not defined: ${missingParams.join(', ')}`);
    }
    
    return errors;
  };
  
  if (loading && !prompt) {
    return (
      <Flex justify="center" align="center" h="500px">
        <Spinner size="xl" />
      </Flex>
    );
  }
  
  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">
          {promptId ? `Editing Prompt: ${promptId}` : 'New Prompt'}
        </Heading>
        <Button 
          colorScheme="blue" 
          onClick={savePrompt}
          isLoading={loading}
          isDisabled={!isDirty}
        >
          Save
        </Button>
      </Flex>
      
      <Grid templateColumns="repeat(12, 1fr)" gap={4}>
        {/* Main editor area */}
        <GridItem colSpan={{ base: 12, md: 7 }}>
          <Box borderWidth="1px" borderRadius="md" h="600px" overflow="hidden">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={content}
              onChange={handleContentChange}
              onMount={handleEditorDidMount}
              theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                wrappingIndent: 'same',
                fontSize: 14,
              }}
            />
          </Box>
          
          {/* Testing & Version Control */}
          <Box mt={4}>
            <Tabs>
              <TabList>
                <Tab>Test Runner</Tab>
                <Tab>Version History</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <TestRunner 
                    promptId={promptId} 
                    parameters={parameters} 
                  />
                </TabPanel>
                <TabPanel>
                  <VersionControl 
                    promptId={promptId}
                    currentVersion={currentVersion}
                    onVersionChange={handleVersionChange}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </GridItem>
        
        {/* Sidebar */}
        <GridItem colSpan={{ base: 12, md: 5 }}>
          <Tabs>
            <TabList>
              <Tab>Metadata</Tab>
              <Tab>Parameters</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <MetadataPanel 
                  metadata={metadata} 
                  onChange={handleMetadataUpdate} 
                />
              </TabPanel>
              <TabPanel>
                <ParameterPanel 
                  parameters={parameters} 
                  onChange={handleParametersUpdate} 
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
          
          {/* Validation errors */}
          {isDirty && (
            <Box mt={4}>
              {validateParameters().map((error, index) => (
                <Text key={index} color="red.500" fontSize="sm">
                  {error}
                </Text>
              ))}
            </Box>
          )}
        </GridItem>
      </Grid>
    </Box>
  );
};

export default PromptEditor;