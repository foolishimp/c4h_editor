import { useState, useCallback } from 'react';
import axios from 'axios';
import { 
  WorkOrder, 
  WorkOrderCreateRequest, 
  WorkOrderUpdateRequest, 
  WorkOrderStatus 
} from '../types/workorder';
import { API_ENDPOINTS } from '../config/api';

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
      const response = await axios.get(API_ENDPOINTS.WORKORDERS, { params: filters });
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
      const response = await axios.get(`${API_ENDPOINTS.WORKORDER(workOrderId)}`);
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
      const response = await axios.post(API_ENDPOINTS.WORKORDERS, workOrderData);
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
      const response = await axios.patch(`${API_ENDPOINTS.WORKORDER(workOrderId)}`, updateData);
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
      const response = await axios.post(`${API_ENDPOINTS.PROMPT(promptId)}/convert-to-workorder`);
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