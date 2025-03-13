// File: frontend/src/components/common/TimeAgo.tsx
import React from 'react';
import { Tooltip, Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

interface TimeAgoProps {
  timestamp: string;
  typography?: boolean;
  variant?: 'body1' | 'body2' | 'caption';
}

// Use default export instead of named export
const TimeAgo: React.FC<TimeAgoProps> = ({ 
  timestamp, 
  typography = true, 
  variant = 'body2' 
}) => {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });
  const formattedDate = date.toLocaleString();

  const content = (
    <Tooltip title={formattedDate}>
      <span>{timeAgo}</span>
    </Tooltip>
  );

  if (typography) {
    return <Typography variant={variant}>{content}</Typography>;
  }

  return content;
};

export default TimeAgo;