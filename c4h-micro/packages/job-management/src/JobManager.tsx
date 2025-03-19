// File: packages/job-management/src/JobManager.tsx
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
