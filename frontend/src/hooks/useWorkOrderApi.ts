// File: frontend/src/hooks/useWorkOrderApi.ts
import { useState } from 'react';
import { WorkOrder } from '../types/workorder';
import { api } from '../config/api';

export function useWorkOrderApi() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getWorkOrders = async (): Promise<WorkOrder[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/workorders');
      const data = response.data;
      setWorkOrders(data);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return [];
    }
  };

  const getWorkOrder = async (id: string): Promise<WorkOrder | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/workorders/${id}`);
      const data = response.data;
      setWorkOrder(data);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  };

  const updateWorkOrder = async (workOrder: WorkOrder): Promise<WorkOrder | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(`/api/v1/workorders/${workOrder.id}`, {
        template: workOrder.template,
        metadata: workOrder.metadata,
        commit_message: "Updated work order",
        author: workOrder.metadata.author
      });
      const data = response.data;
      await getWorkOrders();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  };

  const deleteWorkOrder = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/api/v1/workorders/${id}`, {
        params: {
          commit_message: "Deleted work order",
          author: "user" // Would ideally come from user context
        }
      });
      await getWorkOrders();
      setLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return false;
    }
  };

  const testWorkOrder = async (id: string, parameters?: Record<string, any>): Promise<any> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/v1/workorders/${id}/test`, {
        parameters: parameters || {}
      });
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  };

  const renderWorkOrder = async (data: { workorder_id: string; parameters?: any }): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/v1/workorders/${data.workorder_id}/render`, data.parameters || {});
      setLoading(false);
      return response.data.rendered_workorder;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return '';
    }
  };

  const getWorkOrderHistory = async (id: string): Promise<any> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/workorders/${id}/history`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  };

  const getWorkOrderVersion = async (id: string, versionId: string): Promise<WorkOrder | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/workorders/${id}`, {
        params: { version: versionId }
      });
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  };

  return {
    workOrders,
    workOrder,
    loading,
    error,
    getWorkOrders,
    getWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    testWorkOrder,
    renderWorkOrder,
    getWorkOrderHistory,
    getWorkOrderVersion
  };
}