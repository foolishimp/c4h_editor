import WorkOrderEditor from './components/WorkOrderEditor/WorkOrderEditor';
import JobsList from './components/JobsList/JobsList';
import JobDetails from './components/JobDetails/JobDetails';
import { useWorkOrderApi } from './hooks/useWorkOrderApi';
import { useJobApi } from './hooks/useJobApi';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, Box } from '@chakra-ui/react';
import Navigation from './components/common/Navigation';
import WorkOrderEditor from './components/WorkOrderEditor/WorkOrderEditor';
import JobsList from './components/JobsList/JobsList';
import JobDetails from './components/JobDetails/JobDetails';
import { useWorkOrderApi } from './hooks/useWorkOrderApi';
import { useJobApi } from './hooks/useJobApi';
// other imports...
import { WorkOrder } from './types/workorder';

const App: React.FC = () => {
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  
  const { 
    workOrders, 
    loading, 
    getWorkOrders, 
    getWorkOrder,
    getWorkOrderHistory,
    getWorkOrderVersion,
    createWorkOrder, 
    updateWorkOrder, 
    deleteWorkOrder,
    testWorkOrder,
    renderWorkOrder
  } = useWorkOrderApi();
  
  const { jobs, getJobs, getJob, submitJob, cancelJob } = useJobApi();

  const handleJobSelect = (jobId: string) => setSelectedJob(jobId);
  const handleSubmitJob = submitJob;
  const handleRefresh = getJobs;
  const handleCancelJob = cancelJob;

  useEffect(() => {
    getWorkOrders();
    getJobs();
  }, []);

  return (
    <ChakraProvider>
      <Router>
        <Box className="app">
          <Navigation />
          <Box className="content">
            <Routes>
              <Route path="/" element={<Navigate to="/workorders" />} />
              <Route path="/workorders" element={
                selectedWorkOrderId ? (
                  <WorkOrderEditor 
                    workOrderId={selectedWorkOrderId}
                    onSave={() => getWorkOrders()}
                    onUpdate={() => getWorkOrders()}
                    onDelete={() => {
                      setSelectedWorkOrderId(null);
                      getWorkOrders();
                    }}
                    onTest={() => {}}
                    onRender={async () => ""}
                    onGetHistory={getWorkOrderHistory}
                    onGetVersion={getWorkOrderVersion}
                  />
                ) : (
                  <div>
                    <h2>Work Orders</h2>
                    <button onClick={() => setSelectedWorkOrderId('new')}>Create New</button>
                    <ul>
                      {workOrders.map(wo => (
                        <li key={wo.id}>
                          <a href="#" onClick={() => setSelectedWorkOrderId(wo.id)}>
                            {wo.title || wo.id}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              } />
              <Route path="/jobs" element={
                <div>
                  <JobsList 
                    jobs={jobs}
                    workOrders={workOrders}
                    onSelect={handleJobSelect}
                    onSubmitJob={handleSubmitJob}
                    onRefresh={handleRefresh}
                  />
                  {selectedJob && (
                    <JobDetails 
                      jobId={selectedJob}
                      onClose={() => setSelectedJob(null)}
                      onCancel={handleCancelJob}
                    />
                  )}
                </div>
              } />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ChakraProvider>
  );
};

export default App;