#!/usr/bin/env python3
# migration_script_03d.py
#
# This script creates the main JobManager component for the JobManagement microfrontend

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

def create_job_manager():
    job_management_dir = BASE_DIR / "packages" / "job-management"
    
    # Create JobManager.tsx
    job_manager = """// File: packages/job-management/src/JobManager.tsx
import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { JobProvider } from './contexts/JobContext';
import JobCreator from './components/JobCreator';
import JobsList from './components/JobsList';
import JobDetails from './components/JobDetails';

interface JobManagerProps {
  showJobCreator?: boolean;
}

const JobManager: React.FC<JobManagerProps> = ({ showJobCreator = true }) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  return (
    <JobProvider>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Job Management
        </Typography>
        
        {showJobCreator && (
          <JobCreator />
        )}
        
        <Box mt={4}>
          <JobsList onSelectJob={setSelectedJobId} />
        </Box>
        
        {selectedJobId && (
          <JobDetails 
            jobId={selectedJobId} 
            onClose={() => setSelectedJobId(null)} 
          />
        )}
      </Box>
    </JobProvider>
  );
};

export default JobManager;
"""
    
    write_file(job_management_dir / "src" / "JobManager.tsx", job_manager)
    
    print("JobManager component created successfully!")

if __name__ == "__main__":
    create_job_manager()