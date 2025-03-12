// File: frontend/src/components/common/DiffViewer.tsx

import React, { useMemo } from 'react';
import { Box, Text, useColorMode } from '@chakra-ui/react';
import Editor from '@monaco-editor/react';
import * as diffLib from 'diff';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  splitView?: boolean;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  title?: string;
}

/**
 * Custom DiffViewer component for showing differences between two text contents
 * Built using Monaco Editor and diff library for React 18 compatibility
 */
const DiffViewer: React.FC<DiffViewerProps> = ({
  oldContent,
  newContent,
  splitView = true,
  showLineNumbers = true,
  title
}) => {
  const { colorMode } = useColorMode();
  
  // Generate diff content for inline view
  const inlineDiffContent = useMemo(() => {
    if (!splitView) {
      // For inline diff, we'll use the diff library to create a unified diff
      const diff = diffLib.createPatch(
        'file',           // filename (just a placeholder)
        oldContent || '', // old string
        newContent || '', // new string
        '',               // header (optional)
        '',               // header (optional)
        { context: 3 }    // options - lines of context
      );
      return diff;
    }
    return '';  // Return empty string instead of null to fix type error
  }, [oldContent, newContent, splitView]);

  return (
    <Box width="100%" border="1px solid" borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'} borderRadius="md" overflow="hidden">
      {title && (
        <Box p={2} fontWeight="semibold" bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'}>
          {title}
        </Box>
      )}

      {splitView ? (
        // Split view with two editors side by side
        <Box display="flex" height="400px">
          <Box flex="1" borderRight="1px solid" borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}>
            <Text p={1} fontSize="sm" bg={colorMode === 'dark' ? 'red.900' : 'red.50'} color={colorMode === 'dark' ? 'red.100' : 'red.800'}>
              Original
            </Text>
            <Editor
              height="calc(100% - 24px)"
              defaultLanguage="text"
              value={oldContent}
              theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: showLineNumbers ? 'on' : 'off',
                wordWrap: 'on',
                wrappingIndent: 'same',
                fontSize: 12,
                scrollBeyondLastLine: false,
              }}
            />
          </Box>
          <Box flex="1">
            <Text p={1} fontSize="sm" bg={colorMode === 'dark' ? 'green.900' : 'green.50'} color={colorMode === 'dark' ? 'green.100' : 'green.800'}>
              Modified
            </Text>
            <Editor
              height="calc(100% - 24px)"
              defaultLanguage="text"
              value={newContent}
              theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: showLineNumbers ? 'on' : 'off',
                wordWrap: 'on',
                wrappingIndent: 'same',
                fontSize: 12,
                scrollBeyondLastLine: false,
              }}
            />
          </Box>
        </Box>
      ) : (
        // Inline view with unified diff
        <Box height="400px">
          <Editor
            height="100%"
            defaultLanguage="diff"
            value={inlineDiffContent}
            theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: showLineNumbers ? 'on' : 'off',
              wordWrap: 'on',
              wrappingIndent: 'same',
              fontSize: 12,
              scrollBeyondLastLine: false,
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default DiffViewer;