// File: frontend/src/hooks/useWorkOrderApi.ts
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
  const createWorkOrder = useCallback(async (params: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/v1/workorders', params);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a workorder
  const updateWorkOrder = useCallback(async (params: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(`/api/v1/workorders/${params.id}`, params);
      return response.data;
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
      await api.delete(`/api/v1/workorders/${id}`);
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