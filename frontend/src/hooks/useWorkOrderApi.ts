import { useState } from 'react';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { WorkOrder, WorkOrderDiff } from '../types/workorder';

const useWorkOrderApi = () => {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getWorkOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.WORKORDERS);
      setWorkOrders(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to get work orders');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getWorkOrder = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.WORKORDER(id));
      setWorkOrder(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to get work order');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createWorkOrder = async (data: Partial<WorkOrder>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.WORKORDERS, data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to create work order');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateWorkOrder = async (id: string, data: Partial<WorkOrder>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.put(API_ENDPOINTS.WORKORDER(id), data);
      setWorkOrder(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to update work order');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkOrder = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await apiClient.delete(API_ENDPOINTS.WORKORDER(id));
      setWorkOrders(workOrders.filter(p => p.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete work order');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getWorkOrderHistory = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.WORKORDER_HISTORY(id));
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to get work order history');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getWorkOrderVersion = async (id: string, versionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.WORKORDER_VERSION(id, versionId));
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to get work order version');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createWorkOrderVersion = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.WORKORDER_HISTORY(id));
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to create work order version');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getWorkOrderDiff = async (id: string, versionId: string): Promise<WorkOrderDiff> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.WORKORDER_DIFF(id, versionId));
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to get work order diff');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const renderWorkOrder = async (id: string, parameters?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.WORKORDER_RENDER(id), { parameters });
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to render work order');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const testWorkOrder = async (id: string, parameters?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.WORKORDER_TEST(id), { parameters });
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to test work order');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    workOrder,
    workOrders,
    loading,
    error,
    getWorkOrders,
    getWorkOrder,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    getWorkOrderHistory,
    getWorkOrderVersion,
    createWorkOrderVersion,
    getWorkOrderDiff,
    renderWorkOrder,
    testWorkOrder
  };
};

export default useWorkOrderApi;