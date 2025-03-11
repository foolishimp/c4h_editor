// File: frontend/src/hooks/useWorkOrderApi.ts

import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { 
  WorkOrder, 
  WorkOrderListItem, 
  WorkOrderVersion, 
  WorkOrderTestCase 
} from '../types/workorder';

import { API_ENDPOINTS } from '../config/api';

interface WorkOrderTestResponse {
  workorder_id: string;
  rendered_workorder: string;
  parameters: Record<string, any>;
  model_response?: string;
  test_results?: Array<Record<string, any>>;
  execution_time: number;
  timestamp: string;
}

export interface UseWorkOrderApiReturn {
  workorders: WorkOrderListItem[];
  loading: boolean;
  error: string | null;
  getWorkOrders: () => Promise<WorkOrderListItem[]>;
  getWorkOrder: (id: string, version?: string) => Promise<WorkOrder>;
  createWorkOrder: (data: any) => Promise<WorkOrder>;
  updateWorkOrder: (id: string, data: any) => Promise<WorkOrder>;
  deleteWorkOrder: (id: string, commit_message: string, author: string) => Promise<void>;
  getWorkOrderHistory: (id: string) => Promise<WorkOrderVersion[]>;
  getWorkOrderDiff: (id: string, fromVersion: string, toVersion: string) => Promise<string>;
  renderWorkOrder: (id: string, parameters: Record<string, any>, version?: string) => Promise<string>;
  testWorkOrder: (id: string, parameters: Record<string, any>, testCases?: WorkOrderTestCase[], version?: string) => Promise<WorkOrderTestResponse>;
  cloneWorkOrder: (id: string, newId: string, author: string) => Promise<WorkOrder>;
  // Aliases for backward compatibility
  fetchWorkOrders: () => Promise<WorkOrderListItem[]>;
  fetchWorkOrder: (id: string, version?: string) => Promise<WorkOrder>;
  fetchHistory: (id: string) => Promise<WorkOrderVersion[]>;
  getDiff: (id: string, fromVersion: string, toVersion: string) => Promise<string>;
}

export const useWorkOrderApi = (): UseWorkOrderApiReturn => {
  const [workorders, setWorkOrders] = useState<WorkOrderListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleResponse = <T,>(response: AxiosResponse<T>): T => {
    return response.data;
  };

  const handleError = (error: AxiosError): never => {
    const message = error.response?.data && 'detail' in (error.response.data as any)
      ? (error.response.data as any).detail
      : error.message || 'An unknown error occurred';
    setError(message);
    throw new Error(message);
  };

  const getWorkOrders = useCallback(async (): Promise<WorkOrderListItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<WorkOrderListItem[]>(API_ENDPOINTS.WORKORDERS);
      const data = handleResponse(response);
      setWorkOrders(data);
      return data;
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkOrder = useCallback(async (id: string, version?: string): Promise<WorkOrder> => {
    setLoading(true);
    setError(null);
    try {
      const url = version
        ? `${API_ENDPOINTS.WORKORDER(id)}?version=${version}`
        : API_ENDPOINTS.WORKORDER(id);
      const response = await axios.get<WorkOrder>(url);
      return handleResponse(response);
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkOrder = useCallback(async (data: any): Promise<WorkOrder> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<WorkOrder>(API_ENDPOINTS.WORKORDERS, data);
      return handleResponse(response);
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWorkOrder = useCallback(async (id: string, data: any): Promise<WorkOrder> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put<WorkOrder>(API_ENDPOINTS.WORKORDER(id), data);
      return handleResponse(response);
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteWorkOrder = useCallback(async (id: string, commit_message: string, author: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_ENDPOINTS.WORKORDER(id)}?commit_message=${encodeURIComponent(commit_message)}&author=${encodeURIComponent(author)}`);
    } catch (err) {
      handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkOrderHistory = useCallback(async (id: string): Promise<WorkOrderVersion[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ versions: WorkOrderVersion[] }>(API_ENDPOINTS.WORKORDER_HISTORY(id));
      return handleResponse(response).versions;
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkOrderDiff = useCallback(async (id: string, fromVersion: string, toVersion: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ diff: string }>(
        `${API_ENDPOINTS.WORKORDER_DIFF(id)}?from_version=${fromVersion}&to_version=${toVersion}`
      );
      return handleResponse(response).diff;
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const renderWorkOrder = useCallback(async (id: string, parameters: Record<string, any>, version?: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const url = version
        ? `${API_ENDPOINTS.WORKORDER_RENDER(id)}?version=${version}`
        : API_ENDPOINTS.WORKORDER_RENDER(id);
      const response = await axios.post<{ rendered_workorder: string }>(url, parameters);
      return handleResponse(response).rendered_workorder;
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const testWorkOrder = useCallback(async (id: string, parameters: Record<string, any>, testCases?: WorkOrderTestCase[], version?: string): Promise<WorkOrderTestResponse> => {
    setLoading(true);
    setError(null);
    try {
      const url = version
        ? `${API_ENDPOINTS.WORKORDER_TEST(id)}?version=${version}`
        : API_ENDPOINTS.WORKORDER_TEST(id);
      const response = await axios.post<WorkOrderTestResponse>(url, { 
        parameters, 
        test_cases: testCases 
      });
      return handleResponse(response);
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const cloneWorkOrder = useCallback(async (id: string, newId: string, author: string): Promise<WorkOrder> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<WorkOrder>(
        `${API_ENDPOINTS.WORKORDER(id)}/clone?new_id=${newId}&author=${encodeURIComponent(author)}`
      );
      return handleResponse(response);
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getWorkOrders();
  }, [getWorkOrders]);

  return {
    workorders,
    loading,
    error,
    getWorkOrders,
    getWorkOrder,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    getWorkOrderHistory,
    getWorkOrderDiff,
    renderWorkOrder,
    testWorkOrder,
    cloneWorkOrder,
    // Aliases for backward compatibility
    fetchWorkOrders: getWorkOrders,
    fetchWorkOrder: getWorkOrder,
    fetchHistory: getWorkOrderHistory,
    getDiff: getWorkOrderDiff
  };
};