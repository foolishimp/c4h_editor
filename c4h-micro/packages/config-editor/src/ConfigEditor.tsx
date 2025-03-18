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
  // Use string Record type to match react-router-dom's useParams constraint
  const { id } = useParams<Record<string, string | undefined>>();
  
  return (
    <WorkOrderProvider>
      <WorkOrderEditor workOrderId={id} />
    </WorkOrderProvider>
  );
};

export default ConfigEditor;