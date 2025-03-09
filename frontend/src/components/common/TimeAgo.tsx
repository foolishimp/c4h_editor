// File: frontend/src/components/common/TimeAgo.tsx

import React, { useState, useEffect } from 'react';
import { Text, Tooltip } from '@chakra-ui/react';

export interface TimeAgoProps {
  date: string | Date;
  tooltipFormat?: boolean;
  color?: string;
  fontSize?: string;
}

/**
 * TimeAgo component for showing relative time (e.g., "2 hours ago")
 */
const TimeAgo: React.FC<TimeAgoProps> = ({
  date,
  tooltipFormat = false,
  color,
  fontSize
}) => {
  const [timeAgo, setTimeAgo] = useState<string>('');
  
  useEffect(() => {
    // Convert to date object if string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Format for tooltip
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Calculate time difference for relative time
    const updateTimeAgo = () => {
      const now = new Date();
      const diff = now.getTime() - dateObj.getTime();
      
      // Convert to appropriate time unit
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const months = Math.floor(days / 30);
      const years = Math.floor(months / 12);
      
      if (years > 0) {
        setTimeAgo(`${years} ${years === 1 ? 'year' : 'years'} ago`);
      } else if (months > 0) {
        setTimeAgo(`${months} ${months === 1 ? 'month' : 'months'} ago`);
      } else if (days > 0) {
        setTimeAgo(`${days} ${days === 1 ? 'day' : 'days'} ago`);
      } else if (hours > 0) {
        setTimeAgo(`${hours} ${hours === 1 ? 'hour' : 'hours'} ago`);
      } else if (minutes > 0) {
        setTimeAgo(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`);
      } else {
        setTimeAgo('just now');
      }
    };
    
    updateTimeAgo();
    
    // Update every minute for recent content
    const interval = setInterval(updateTimeAgo, 60000);
    return () => clearInterval(interval);
  }, [date]);
  
  return tooltipFormat ? (
    <Tooltip label={typeof date === 'string' ? new Date(date).toLocaleString() : date.toLocaleString()}>
      <Text as="span" color={color} fontSize={fontSize}>{timeAgo}</Text>
    </Tooltip>
  ) : (
    <Text as="span" color={color} fontSize={fontSize}>{timeAgo}</Text>
  );
};

export default TimeAgo;