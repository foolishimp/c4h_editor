// File: frontend/src/components/PromptEditor/TestRunner.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Textarea,
  Heading,
  Badge,
  Text,
  Spinner,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,

  Flex,
  Spacer,

  Select,
  HStack,

  useColorModeValue
} from '@chakra-ui/react';
import { usePromptApi } from '../../hooks/usePromptApi';
import { PromptParameter, PromptTestResponse } from '../../types/prompt';

// TestRunner.tsx interface (add to the file)
interface TestRunnerProps {
  promptId: string;
  parameters: any[];
  runTest: (parameters: Record<string, any>) => Promise<any>;
}

/**
 * Component for testing prompts with parameters and viewing results
 */
const TestRunner: React.FC<TestRunnerProps> = ({ promptId, parameters }) => {
  const { testPrompt, renderPrompt, loading } = usePromptApi();
  const toast = useToast();
  
  // State for test parameters
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [renderedPrompt, setRenderedPrompt] = useState<string>('');
  const [modelResponse, setModelResponse] = useState<string>('');
  const [testResult, setTestResult] = useState<PromptTestResponse | null>(null);
  const [activeTestMode, setActiveTestMode] = useState<'render' | 'test'>('render');
  
  // Colors
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const cardHeaderBg = useColorModeValue('gray.100', 'gray.600');
  
  // Initialize parameter values with defaults
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    parameters.forEach(param => {
      if (param.default !== undefined) {
        initialValues[param.name] = param.default;
      } else {
        // Set default empty values based on type
        switch (param.type) {
          case 'string':
            initialValues[param.name] = '';
            break;
          case 'number':
            initialValues[param.name] = 0;
            break;
          case 'boolean':
            initialValues[param.name] = false;
            break;
          case 'array':
            initialValues[param.name] = [];
            break;
          case 'object':
            initialValues[param.name] = {};
            break;
        }
      }
    });
    setParamValues(prev => ({ ...initialValues, ...prev }));
  }, [parameters]);
  
  // Handle parameter value change
  const handleParamChange = (name: string, value: any) => {
    setParamValues(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Parse value based on parameter type
  const parseParamValue = (param: PromptParameter, value: string): any => {
    try {
      switch (param.type) {
        case 'string':
          return value;
        case 'number':
          return Number(value);
        case 'boolean':
          return value === 'true';
        case 'array':
        case 'object':
          return value ? JSON.parse(value) : param.type === 'array' ? [] : {};
        default:
          return value;
      }
    } catch (error) {
      toast({
        title: 'Invalid value',
        description: `Could not parse ${param.name} as ${param.type}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return param.default;
    }
  };
  
  // Handle test run
  const handleRunTest = async () => {
    try {
      const parsedParams: Record<string, any> = {};
      
      // Parse all parameter values based on their types
      parameters.forEach(param => {
        parsedParams[param.name] = parseParamValue(param, String(paramValues[param.name]));
      });
      
      if (activeTestMode === 'render') {
        const result = await renderPrompt(promptId, parsedParams);
        setRenderedPrompt(result);
      } else {
        const result = await testPrompt(promptId, parsedParams);
        setTestResult(result);
        setRenderedPrompt(result.rendered_prompt);
        setModelResponse(result.model_response || '');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to run test',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  return (
    <Box>
      <Heading size="md" mb={4}>Test Runner</Heading>
      
      <Stack spacing={4}>
        {/* Parameter inputs */}
        <Card bg={cardBg}>
          <CardHeader bg={cardHeaderBg} py={2} px={4}>
            <Heading size="sm">Parameters</Heading>
          </CardHeader>
          <CardBody>
            {parameters.length > 0 ? (
              <Stack spacing={4}>
                {parameters.map((param) => (
                  <FormControl key={param.name} isRequired={param.required}>
                    <FormLabel>
                      {param.name}
                      <Badge ml={2} colorScheme={getTypeColor(param.type)}>
                        {param.type}
                      </Badge>
                    </FormLabel>
                    
                    {param.type === 'string' && (
                      <Input
                        value={paramValues[param.name] || ''}
                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                        placeholder={param.description}
                      />
                    )}
                    
                    {param.type === 'number' && (
                      <Input
                        type="number"
                        value={paramValues[param.name] !== undefined ? paramValues[param.name] : ''}
                        onChange={(e) => handleParamChange(param.name, e.target.value ? Number(e.target.value) : '')}
                        placeholder={param.description}
                      />
                    )}
                    
                    {param.type === 'boolean' && (
                      <Select
                        value={String(paramValues[param.name])}
                        onChange={(e) => handleParamChange(param.name, e.target.value === 'true')}
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </Select>
                    )}
                    
                    {(param.type === 'array' || param.type === 'object') && (
                      <Textarea
                        value={
                          paramValues[param.name] !== undefined 
                            ? typeof paramValues[param.name] === 'string'
                              ? paramValues[param.name]
                              : JSON.stringify(paramValues[param.name], null, 2)
                            : ''
                        }
                        onChange={(e) => {
                          try {
                            const value = e.target.value 
                              ? JSON.parse(e.target.value) 
                              : param.type === 'array' ? [] : {};
                            handleParamChange(param.name, value);
                          } catch (err) {
                            // Allow invalid JSON during typing
                            handleParamChange(param.name, e.target.value);
                          }
                        }}
                        placeholder={`Enter ${param.type} as JSON...`}
                        fontFamily="monospace"
                      />
                    )}
                    
                    {param.description && (
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        {param.description}
                      </Text>
                    )}
                  </FormControl>
                ))}
              </Stack>
            ) : (
              <Text color="gray.500">
                No parameters defined. Add parameters in the Parameters panel.
              </Text>
            )}
            
            <Flex mt={4}>
              <Select
                value={activeTestMode}
                onChange={(e) => setActiveTestMode(e.target.value as 'render' | 'test')}
                maxWidth="200px"
                mr={2}
              >
                <option value="render">Render Only</option>
                <option value="test">Full Test (with Model)</option>
              </Select>
              <Spacer />
              <Button
                colorScheme="blue"
                onClick={handleRunTest}
                isLoading={loading}
                isDisabled={parameters.length === 0}
              >
                {activeTestMode === 'render' ? 'Render Prompt' : 'Run Test'}
              </Button>
            </Flex>
          </CardBody>
        </Card>
        
        {/* Results */}
        {(renderedPrompt || modelResponse) && (
          <Card bg={cardBg}>
            <CardHeader bg={cardHeaderBg} py={2} px={4}>
              <Heading size="sm">Test Results</Heading>
            </CardHeader>
            <CardBody>
              <Tabs variant="enclosed">
                <TabList>
                  <Tab>Rendered Prompt</Tab>
                  {modelResponse && <Tab>Model Response</Tab>}
                  {testResult && <Tab>Execution Details</Tab>}
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <Box
                      bg={useColorModeValue('gray.100', 'gray.800')}
                      p={4}
                      borderRadius="md"
                      fontFamily="monospace"
                      whiteSpace="pre-wrap"
                      overflowX="auto"
                    >
                      {renderedPrompt || <Spinner />}
                    </Box>
                  </TabPanel>
                  
                  {modelResponse && (
                    <TabPanel>
                      <Box
                        bg={useColorModeValue('gray.100', 'gray.800')}
                        p={4}
                        borderRadius="md"
                        fontFamily="monospace"
                        whiteSpace="pre-wrap"
                        overflowX="auto"
                      >
                        {modelResponse || <Spinner />}
                      </Box>
                    </TabPanel>
                  )}
                  
                  {testResult && (
                    <TabPanel>
                      <Stack spacing={4}>
                        <HStack>
                          <Text fontWeight="bold">Execution Time:</Text>
                          <Text>{testResult.execution_time.toFixed(2)}s</Text>
                        </HStack>
                        <HStack>
                          <Text fontWeight="bold">Timestamp:</Text>
                          <Text>{new Date(testResult.timestamp).toLocaleString()}</Text>
                        </HStack>
                      </Stack>
                    </TabPanel>
                  )}
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>
        )}
      </Stack>
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

export default TestRunner;