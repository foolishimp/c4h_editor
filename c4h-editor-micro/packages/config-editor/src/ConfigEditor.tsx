// File: packages/config-editor/src/ConfigEditor.tsx
/**
 * Main component for the Config Editor microfrontend
 * This is the entry point exposed via Module Federation
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { WorkOrderProvider } from './contexts/WorkOrderContext';
import WorkOrderEditor from './components/WorkOrderEditor';

// Main component exported for Module Federation
const ConfigEditor: React.FC = () => {
  // Get workOrderId from URL params
  const { id } = useParams<{ id?: string }>();
  
  return (
    <WorkOrderProvider>
      <WorkOrderEditor workOrderId={id} />
    </WorkOrderProvider>
  );
};

export default ConfigEditor;
