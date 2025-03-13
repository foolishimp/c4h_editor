// File: frontend/src/hooks/useWorkOrderApi.ts
import { useState, useCallback } from 'react';
import { WorkOrder } from '../types/workorder';
import { api } from '../config/api';

export const useWorkOrderApi = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

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
    getWorkOrderHistory,
    testWorkOrder,      // Make sure this expects (id, parameters)
    renderWorkOrder     // Make sure this expects (id, parameters)
  };
};