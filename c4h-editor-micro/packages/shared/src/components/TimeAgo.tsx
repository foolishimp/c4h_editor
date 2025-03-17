// File: c4h-editor-micro/packages/shared/src/components/TimeAgo.tsx
// Migrated from original frontend

// File: frontend/src/components/common/TimeAgo.tsx
import React from 'react';
import { Tooltip, Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

interface TimeAgoProps {
  timestamp?: string;
  date?: string; // Support both prop names for backward compatibility
  typography?: boolean;
  variant?: 'body1' | 'body2' | 'caption';
}

// TimeAgo component that shows relative time with full timestamp on hover
const TimeAgo: React.FC<TimeAgoProps> = ({ 
  timestamp, 
  date, // Support both prop names for backward compatibility
  typography = true, 
  variant = 'body2' 
}) => {
  // Use either timestamp or date prop
  const dateString = timestamp || date;
  
  if (!dateString) {
    return null;
  }

  try {
    const dateObj = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error(`Invalid date: ${dateString}`);
      return null;
    }
    
    const timeAgo = formatDistanceToNow(dateObj, { addSuffix: true });
    const formattedDate = dateObj.toLocaleString();
    
    const content = (
      <Tooltip title={formattedDate}>
        <span>{timeAgo}</span>
      </Tooltip>
    );
    
    if (typography) {
      return <Typography variant={variant}>{content}</Typography>;
    }
    
    return content;
  } catch (error) {
    console.error(`Error parsing date: ${dateString}`, error);
    return null;
  }
};

export default TimeAgo;