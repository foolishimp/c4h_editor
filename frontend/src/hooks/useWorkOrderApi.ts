// File: frontend/src/hooks/useWorkOrderApi.ts
/**
 * Custom hook for interacting with the WorkOrder API
 * Provides methods for CRUD operations on work orders
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkOrder } from '../types/workorder';
import api from '../config/api';

export const useWorkOrderApi = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use navigate safely - if we're not in a Router context, this will be undefined
  // but we'll handle that case gracefully
  let navigate;
  try {
    navigate = useNavigate();
  } catch (e) {
    // If we're not in a Router context, just use a no-op function
    navigate = (path: string) => {
      console.warn(`Navigation to ${path} was attempted outside of Router context`);
    };
  }

  // Fetch all workorders
  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/workorders');
      setWorkOrders(response.data);
      return response.data;
    } catch (err) {
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch a single workorder by ID
  const fetchWorkOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/workorders/${id}`);
      setWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new workorder
  const createWorkOrder = useCallback(async (workOrder: WorkOrder) => {
    setLoading(true);
    setError(null);
    try {
      // Format the request data according to backend expectations
      const requestData = {
        id: workOrder.id,
        template: workOrder.template,
        metadata: workOrder.metadata,
        commit_message: "Initial creation",
        author: workOrder.metadata.author || "system"
      };
      
      const response = await api.post('/api/v1/workorders', requestData);
      
      // Update the local state with the response
      if (response.data) {
        setWorkOrder(response.data);
      }
      
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a workorder
  const updateWorkOrder = useCallback(async (workOrder: WorkOrder) => {
    setLoading(true);
    setError(null);
    try {
      // Process metadata for valid date format before sending
      const metadata = { ...workOrder.metadata };
      
      // Set empty dates to null to avoid validation errors
      if (metadata.due_date === '') {
        metadata.due_date = null;
      }
      
      // Format the request data according to backend expectations
      const requestData = {
        template: workOrder.template,
        metadata: metadata,
        commit_message: "Updated via editor",
        author: workOrder.metadata.author || "system"
      };
      
      console.log("Sending update request:", JSON.stringify(requestData));
      
      try {
        const response = await api.put(`/api/v1/workorders/${workOrder.id}`, requestData);
        
        // Update the local state with the response
        if (response.data) {
          setWorkOrder(response.data);
        }
        
        return response.data;
      } catch (apiErr: any) {
        console.error("API Error details:", apiErr.response?.data || apiErr.message);
        throw apiErr;
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a workorder
  const deleteWorkOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/api/v1/workorders/${id}?commit_message=Deleted&author=system`);
      return true;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Archive a workorder
  const archiveWorkOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/v1/workorders/${id}/archive`);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Unarchive a workorder
  const unarchiveWorkOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/v1/workorders/${id}/unarchive`);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clone a workorder
  const cloneWorkOrder = useCallback(async (id: string, newId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/v1/workorders/${id}/clone`, { new_id: newId });
      const clonedId = response.data.id;
      
      // Only navigate if we have a valid navigate function (inside Router context)
      if (navigate && typeof navigate === 'function') {
        navigate(`/workorders/${clonedId}`);
      }
      
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Get workorder history
  const getWorkOrderHistory = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/workorders/${id}/history`);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Test a workorder
  const testWorkOrder = useCallback(async (id: string, parameters: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/v1/workorders/${id}/test`, { parameters });
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Render a workorder
  const renderWorkOrder = useCallback(async (id: string, parameters: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/v1/workorders/${id}/render`, parameters);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Return all the API functions
  return {
    workOrders,
    workOrder,
    loading,
    error,
    fetchWorkOrders,
    fetchWorkOrder,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    archiveWorkOrder,
    unarchiveWorkOrder,
    cloneWorkOrder,
    getWorkOrderHistory,
    testWorkOrder,
    renderWorkOrder
  };
};

export default useWorkOrderApi;