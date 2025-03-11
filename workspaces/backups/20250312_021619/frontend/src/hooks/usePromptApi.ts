// File: frontend/src/hooks/usePromptApi.ts

import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { 
  Prompt, 
  PromptListItem, 
  PromptVersion, 
  PromptTestResponse 
} from '../types/prompt';


// For TypeScript to recognize Vite's import.meta.env
/// <reference types="vite/client" />
const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface UsePromptApiReturn {
  prompts: PromptListItem[];
  loading: boolean;
  error: string | null;
  getPrompts: () => Promise<PromptListItem[]>;
  getPrompt: (id: string, version?: string) => Promise<Prompt>;
  createPrompt: (data: any) => Promise<Prompt>;
  updatePrompt: (id: string, data: any) => Promise<Prompt>;
  deletePrompt: (id: string, commit_message: string, author: string) => Promise<void>;
  getPromptHistory: (id: string) => Promise<PromptVersion[]>;
  getPromptDiff: (id: string, fromVersion: string, toVersion: string) => Promise<string>;
  renderPrompt: (id: string, parameters: Record<string, any>, version?: string) => Promise<string>;
  testPrompt: (id: string, parameters: Record<string, any>, version?: string) => Promise<PromptTestResponse>;
  clonePrompt: (id: string, newId: string, author: string) => Promise<Prompt>;
  // Aliases for backward compatibility
  fetchPrompts: () => Promise<PromptListItem[]>;
  fetchPrompt: (id: string, version?: string) => Promise<Prompt>;
  fetchHistory: (id: string) => Promise<PromptVersion[]>;
  getDiff: (id: string, fromVersion: string, toVersion: string) => Promise<string>;
}

export const usePromptApi = (): UsePromptApiReturn => {
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
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

  const getPrompts = useCallback(async (): Promise<PromptListItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<PromptListItem[]>(`${API_URL}/prompts`);
      const data = handleResponse(response);
      setPrompts(data);
      return data;
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPrompt = useCallback(async (id: string, version?: string): Promise<Prompt> => {
    setLoading(true);
    setError(null);
    try {
      const url = version 
        ? `${API_URL}/prompts/${id}?version=${version}` 
        : `${API_URL}/prompts/${id}`;
      const response = await axios.get<Prompt>(url);
      return handleResponse(response);
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPrompt = useCallback(async (data: any): Promise<Prompt> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<Prompt>(`${API_URL}/prompts`, data);
      return handleResponse(response);
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePrompt = useCallback(async (id: string, data: any): Promise<Prompt> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put<Prompt>(`${API_URL}/prompts/${id}`, data);
      return handleResponse(response);
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePrompt = useCallback(async (id: string, commit_message: string, author: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_URL}/prompts/${id}?commit_message=${encodeURIComponent(commit_message)}&author=${encodeURIComponent(author)}`);
    } catch (err) {
      handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPromptHistory = useCallback(async (id: string): Promise<PromptVersion[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ versions: PromptVersion[] }>(`${API_URL}/prompts/${id}/history`);
      return handleResponse(response).versions;
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPromptDiff = useCallback(async (id: string, fromVersion: string, toVersion: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ diff: string }>(
        `${API_URL}/prompts/${id}/diff?from_version=${fromVersion}&to_version=${toVersion}`
      );
      return handleResponse(response).diff;
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const renderPrompt = useCallback(async (id: string, parameters: Record<string, any>, version?: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const url = version 
        ? `${API_URL}/prompts/${id}/render?version=${version}` 
        : `${API_URL}/prompts/${id}/render`;
      const response = await axios.post<{ rendered_prompt: string }>(url, parameters);
      return handleResponse(response).rendered_prompt;
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const testPrompt = useCallback(async (id: string, parameters: Record<string, any>, version?: string): Promise<PromptTestResponse> => {
    setLoading(true);
    setError(null);
    try {
      const url = version 
        ? `${API_URL}/prompts/${id}/test?version=${version}` 
        : `${API_URL}/prompts/${id}/test`;
      const response = await axios.post<PromptTestResponse>(url, { parameters });
      return handleResponse(response);
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const clonePrompt = useCallback(async (id: string, newId: string, author: string): Promise<Prompt> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<Prompt>(
        `${API_URL}/prompts/${id}/clone?new_id=${newId}&author=${encodeURIComponent(author)}`
      );
      return handleResponse(response);
    } catch (err) {
      return handleError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getPrompts();
  }, [getPrompts]);

  return {
    prompts,
    loading,
    error,
    getPrompts,
    getPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
    getPromptHistory,
    getPromptDiff,
    renderPrompt,
    testPrompt,
    clonePrompt,
    // Aliases for backward compatibility
    fetchPrompts: getPrompts,
    fetchPrompt: getPrompt,
    fetchHistory: getPromptHistory,
    getDiff: getPromptDiff
  };
};