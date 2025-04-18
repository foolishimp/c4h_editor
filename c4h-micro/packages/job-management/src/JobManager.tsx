// File: /packages/job-management/src/JobManager.tsx
import { useState } from 'react';
import { Box, Typography, Container } from '@mui/material';
import { JobProvider } from './contexts/JobContext';
import JobCreator from './components/JobCreator';
import JobsList from './components/JobsList';
import JobDetails from './components/JobDetails';

// --- FIX: Removed index signature ---
interface JobManagerProps {
  showJobCreator?: boolean;
  // Removed: [key: string]: any;
}
// --- END FIX ---

// Using regular function declaration instead of arrow function
// to ensure React hooks work correctly across module boundaries
function JobManager(props: JobManagerProps) {
  // --- FIX: Removed restProps destructuring ---
  const { showJobCreator = true } = props;
  // --- END FIX ---
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  return (
    <JobProvider>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Job Management
        </Typography>
        <Container maxWidth="lg">
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
        </Container>

      </Box>
    </JobProvider>
  );
}

export default JobManager;