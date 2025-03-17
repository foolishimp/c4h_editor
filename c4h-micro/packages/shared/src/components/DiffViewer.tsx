// File: c4h-editor-micro/packages/shared/src/components/DiffViewer.tsx
// Migrated from original frontend

// File: frontend/src/components/common/DiffViewer.tsx
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { createTwoFilesPatch } from 'diff';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  splitView?: boolean;
  title?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  oldContent,
  newContent,
  splitView = true,
  title
}) => {
  // Generate the diff
  const diffText = createTwoFilesPatch(
    'Previous Version', 
    'Current Version', 
    oldContent, 
    newContent
  );
  
  // Simple syntax highlighting for the diff
  const formatDiff = (diff: string) => {
    return diff.split('\n').map((line, index) => {
      if (line.startsWith('+')) {
        return <div key={index} style={{ backgroundColor: '#e6ffed' }}>{line}</div>;
      } else if (line.startsWith('-')) {
        return <div key={index} style={{ backgroundColor: '#ffdce0' }}>{line}</div>;
      } else if (line.startsWith('@')) {
        return <div key={index} style={{ backgroundColor: '#f1f8ff' }}>{line}</div>;
      }
      return <div key={index}>{line}</div>;
    });
  };
  
  if (splitView) {
    return (
      <Box>
        {title && <Typography variant="h6" gutterBottom>{title}</Typography>}
        <Box sx={{ display: 'flex', height: '400px' }}>
          <Box flex={1} p={2} border="1px solid" borderColor="divider" mr={1} overflow="auto">
            <Typography variant="subtitle2" gutterBottom>Previous Version</Typography>
            <pre style={{ margin: 0 }}>{oldContent}</pre>
          </Box>
          <Box flex={1} p={2} border="1px solid" borderColor="divider" overflow="auto">
            <Typography variant="subtitle2" gutterBottom>Current Version</Typography>
            <pre style={{ margin: 0 }}>{newContent}</pre>
          </Box>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box>
      {title && <Typography variant="h6" gutterBottom>{title}</Typography>}
      <Paper variant="outlined" sx={{ p: 2, maxHeight: '400px', overflow: 'auto' }}>
        <pre style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
          {formatDiff(diffText)}
        </pre>
      </Paper>
    </Box>
  );
};

export default DiffViewer;