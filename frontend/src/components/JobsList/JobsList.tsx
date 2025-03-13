// File: frontend/src/components/JobsList/JobsList.tsx
import React from 'react';
import { Job } from '../../types/job';
import { WorkOrder } from '../../types/workorder';

export interface JobsListProps {
  jobs: Job[];
  workOrders: WorkOrder[];
  onSelect: (jobId: string) => void;
  onSubmitJob: (workOrderId: string) => Promise<any>;
  onRefresh: () => void;
}

function JobsList({ 
  jobs, 
  workOrders, 
  onSelect, 
  onSubmitJob, 
  onRefresh 
}: JobsListProps) {
  return (
    <div>
      <h2>Jobs List</h2>
      <button onClick={() => onRefresh()}>Refresh</button>
      
      <div>
        <h3>Work Orders</h3>
        <ul>
          {workOrders.map(workOrder => (
            <li key={workOrder.id}>
              {workOrder.metadata.description || 'Untitled'}
              <button onClick={() => onSubmitJob(workOrder.id)}>Submit Job</button>
            </li>
          ))}
        </ul>
      </div>
      
      <div>
        <h3>Jobs</h3>
        <ul>
          {jobs.map(job => (
            <li key={job.id} onClick={() => onSelect(job.id)}>
              {job.work_order_id} - {job.status}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default JobsList;