import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { } from 'react-router-dom';
import Navigation from './components/common/Navigation';
import PromptLibrary from './components/PromptLibrary/PromptLibrary';
import WorkOrderEditor from './components/WorkOrderEditor/WorkOrderEditor';
import JobsList from './components/JobsList/JobsList';
import JobDetails from './components/JobDetails/JobDetails';
import './index.css';
import { usePromptApi } from './hooks/usePromptApi';
import { useWorkOrderApi } from './hooks/useWorkOrderApi';
import { useJobApi } from './hooks/useJobApi';
import { WorkOrder, WorkOrderStatus } from './types/workorder';

function App() {
  // State
  const [activeView, setActiveView] = useState<'workorders' | 'jobs'>('workorders');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  // API hooks
  const {
    workOrders,
    error: workOrderError,
    getWorkOrders,
    updateWorkOrder,
    deleteWorkOrder,
    testWorkOrder,
    renderWorkOrder,
    getWorkOrderHistory,
    getWorkOrderVersion
  } = useWorkOrderApi();

  const {
    jobs,
    error: jobError,
    getJobs,
    submitJob,
    cancelJob
  } = useJobApi();

  // Effects
  useEffect(() => {
    getWorkOrders();
    getJobs();
  }, []);

  // Handlers
  const handleNavigate = (view: 'workorders' | 'jobs') => {
    setActiveView(view);
    setSelectedWorkOrder(null);
    setSelectedJob(null);
  };

  const handleSelectWorkOrder = (id: string) => {
    setSelectedWorkOrder(id);
    setSelectedJob(null);
  };

  const handleSelectJob = (id: string) => {
    setSelectedJob(id);
    setSelectedWorkOrder(null);
  };

  const handleRefresh = () => {
    getWorkOrders();
    getJobs();
  };

  // Render function
  return (
    <ChakraProvider>
      <Box display="flex" flexDirection="column" height="100vh">
        <Navigation 
          activeView={activeView} 
          onNavigate={handleNavigate} 
          onRefresh={handleRefresh}
        />
        
        <Box flex="1" padding="4" overflow="auto">
          {activeView === 'workorders' && selectedWorkOrder && (
            <WorkOrderEditor
              workOrderId={selectedWorkOrder}
              onSave={async () => {}}
              onUpdate={updateWorkOrder}
              onDelete={() => {
                deleteWorkOrder(selectedWorkOrder);
                setSelectedWorkOrder(null);
              }}
              onTest={() => testWorkOrder(selectedWorkOrder)}
              onRender={() => renderWorkOrder({ workorder_id: selectedWorkOrder })}
              onGetHistory={(id) => getWorkOrderHistory(id)}
              onGetVersion={(id, versionId) => getWorkOrderVersion(id, versionId)}
            />
          )}
          
          {activeView === 'workorders' && !selectedWorkOrder && (
            <div>
              <h2>Work Orders</h2>
              <ul>
                {workOrders.map(workOrder => (
                  <li key={workOrder.id} onClick={() => handleSelectWorkOrder(workOrder.id)}>
                    {workOrder.metadata.description || 'Untitled Work Order'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {activeView === 'jobs' && selectedJob && (
            <JobDetails 
              jobId={selectedJob} 
              onClose={() => setSelectedJob(null)} 
              onCancel={cancelJob}
            />
          )}
          
          {activeView === 'jobs' && !selectedJob && (
            <JobsList 
              jobs={jobs} 
              workOrders={workOrders}
              onSelect={handleSelectJob} 
              onSubmitJob={(workOrderId) => submitJob({ workorder_id: workOrderId })}
              onRefresh={handleRefresh}
            />
          )}
        </Box>
      </Box>
    </ChakraProvider>
  );
}

export default App;