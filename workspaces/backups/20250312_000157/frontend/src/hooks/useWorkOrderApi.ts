import { useState, useCallback } from 'react';
import axios from 'axios';
import { 
  WorkOrder, 
  WorkOrderCreateRequest, 
  WorkOrderUpdateRequest, 
  WorkOrderStatus 
} from '../types/workorder';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export const useWorkOrderApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get all work orders
  const getWorkOrders = useCallback(async (filters?: {
    status?: WorkOrderStatus,
    tag?: string,
    search?: string,
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/workorders`, { params: filters });
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch work orders'));
      setLoading(false);
      throw err;
    }
  }, []);

  // Get a specific work order by ID
  const getWorkOrder = useCallback(async (workOrderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/workorders/${workOrderId}`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch work order'));
      setLoading(false);
      throw err;
    }
  }, []);

  // Create a new work order
  const createWorkOrder = useCallback(async (workOrderData: WorkOrderCreateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/workorders`, workOrderData);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create work order'));
      setLoading(false);
      throw err;
    }
  }, []);

  // Update a work order
  const updateWorkOrder = useCallback(async (workOrderId: string, updateData: WorkOrderUpdateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/workorders/${workOrderId}`, updateData);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update work order'));
      setLoading(false);
      throw err;
    }
  }, []);

  // Convert a prompt to a work order
  const convertPromptToWorkOrder = useCallback(async (promptId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/prompts/${promptId}/convert-to-workorder`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to convert prompt to work order'));
      setLoading(false);
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    getWorkOrders,
    getWorkOrder,
    createWorkOrder,
    updateWorkOrder,
    convertPromptToWorkOrder
  };
};