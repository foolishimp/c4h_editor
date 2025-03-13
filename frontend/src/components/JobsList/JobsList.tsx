// File: frontend/src/components/JobsList/JobsList.tsx
import React from 'react';
import { Job } from '../../types/job';
import { WorkOrder } from '../../types/workorder';

export interface JobsListProps {
  jobs: Job[];
  workOrders: WorkOrder[];
  onSelect: (jobId: string) => void;
  onSubmitJob: (workOrderId: string) => void;
  onRefresh: () => void;
}

export function JobsList({ jobs, workOrders, onSelect, onSubmitJob, onRefresh }: JobsListProps) {
  return (
    <div className="jobs-list">
      <div className="jobs-header">
        <div className="header-actions">
          <button 
            className="btn-primary" 
            onClick={() => onRefresh()}
          >
            Refresh
          </button>
        </div>
      </div>
      {/* Rest of component implementation */}
    </div>
  );
}

export default JobsList;