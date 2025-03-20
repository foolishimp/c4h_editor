// File: c4h-micro/packages/job-management/src/JobManager.tsx
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { JobProvider } from './contexts/JobContext';
import JobCreator from './components/JobCreator';
import JobsList from './components/JobsList';
import JobDetails from './components/JobDetails';

interface JobManagerProps {
  showJobCreator?: boolean;
}

// Using regular function declaration instead of arrow function
// to ensure React hooks work correctly across module boundaries
function JobManager(props: JobManagerProps) {
  const { showJobCreator = true } = props;
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
}

export default JobManager;