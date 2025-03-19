#!/usr/bin/env python3
# migration_script_03g.py
#
# This script creates the TimeAgo component

import os
from pathlib import Path

BASE_DIR = Path("c4h-micro")

def create_directory(path):
    if not path.exists():
        print(f"Creating directory: {path}")
        path.mkdir(parents=True, exist_ok=True)

def write_file(path, content):
    print(f"Writing file: {path}")
    with open(path, "w") as file:
        file.write(content)

def create_time_ago():
    job_management_dir = BASE_DIR / "packages" / "job-management"
    components_dir = job_management_dir / "src" / "components"
    create_directory(components_dir)
    
    # Create TimeAgo.tsx
    time_ago = """// File: packages/job-management/src/components/TimeAgo.tsx
import React from 'react';
import { Tooltip, Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

interface TimeAgoProps {
  timestamp?: string;
  date?: string;
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
"""
    
    write_file(components_dir / "TimeAgo.tsx", time_ago)
    
    print("TimeAgo component created successfully!")

if __name__ == "__main__":
    create_time_ago()