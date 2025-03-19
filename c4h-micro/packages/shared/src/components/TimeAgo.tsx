// File: packages/shared/src/components/TimeAgo.tsx
import React from 'react';
import { Tooltip, Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

interface TimeAgoProps {
  timestamp?: string;
  date?: string; // Support both prop names for backward compatibility
  typography?: boolean;
  variant?: 'body1' | 'body2' | 'caption';
}

const TimeAgo: React.FC<TimeAgoProps> = ({ 
  timestamp, 
  date,
  typography = true, 
  variant = 'body2' 
}) => {
  const dateString = timestamp || date;
  
  if (!dateString) {
    return null;
  }

  try {
    const dateObj = new Date(dateString);
    
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