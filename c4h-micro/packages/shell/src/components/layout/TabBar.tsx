// File: /Users/jim/src/apps/c4h_editor/c4h-micro/packages/shell/src/components/layout/TabBar.tsx

import React from 'react';
// Use Box for container, Divider for visuals
import { Tabs, Tab, Box } from '@mui/material';
import { Frame } from 'shared'; // Added import for Frame type

interface TabBarProps {
  frames: Frame[];
  activeFrameId: string | null;
  // Use standard MUI onChange signature
  onTabChange: (event: React.SyntheticEvent, newFrameId: string) => void;
  width: number; // Pass width from App.tsx
}

const TabBar: React.FC<TabBarProps> = ({ frames, activeFrameId, onTabChange, width }) => {
  // Sort frames by order property
  const sortedFrames = React.useMemo(() => {
    // Ensure frames exist before sorting
    return frames ? [...frames].sort((a, b) => a.order - b.order) : [];
  }, [frames]);

  return (
    // Use Box as the container for vertical tabs, acting like a sidebar
    <Box
      component="nav" // Use nav semantic element
      sx={{
        width: `${width}px`,
        flexShrink: 0,
        borderRight: 1, // Add a border to the right like a sidebar
        borderColor: 'divider',
        height: '100%', // Take full height
        display: 'flex',
        flexDirection: 'column', // Stack elements vertically if needed
        bgcolor: 'background.paper' // Optional: Give it a background color
      }}
      aria-label="workspace frames" // Add accessibility label
    >
        <Tabs
          orientation="vertical" // Set orientation to vertical
          value={activeFrameId || false} // Handle null case for value
          onChange={onTabChange}
          aria-label="Workspace Frames Tabs" // More specific label
          // Styling for vertical tabs
          sx={{
            borderRight: 1, // Can keep or remove if Box border is sufficient
            borderColor: 'divider',
            height: '100%', // Take full height within the Box
            '& .MuiTabs-indicator': { left: 0, width: '4px' }, // Style indicator
          }}
        >
          {sortedFrames.map((frame) => (
            <Tab
                key={frame.id}
                label={frame.name}
                value={frame.id}
                sx={{
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    textTransform: 'none', // Prevent ALL CAPS
                    minHeight: '48px', // Ensure consistent height
                    padding: '12px 16px', // Adjust padding
                    '&.Mui-selected': { // Style for selected tab
                        // backgroundColor: 'action.selected', // Example selection style
                        fontWeight: 'bold',
                    },
                }}
            />
          ))}
        </Tabs>
    </Box>
  );
};

export default TabBar;