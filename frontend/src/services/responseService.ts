import { request } from './api';
import type {
  StandardResponseItem,
  StandardResponseCreateInput,
  StandardResponseUpdateInput,
} from '@/types/commands';

export const responseService = {
  getResponses: (params?: { category?: string; audience?: string; search?: string }): Promise<StandardResponseItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.audience) searchParams.append('audience', params.audience);
    if (params?.search) searchParams.append('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = `/responses${queryString ? `?${queryString}` : ''}`;
    return request<StandardResponseItem[]>(endpoint);
  },

  getCategories: (): Promise<string[]> => {
    return request<string[]>('/responses/categories');
  },

  getAudiences: (): Promise<string[]> => {
    return request<string[]>('/responses/audiences');
  },

  getResponse: (id: number): Promise<StandardResponseItem> => {
    return request<StandardResponseItem>(`/responses/${id}`);
  },

  createResponse: (data: StandardResponseCreateInput): Promise<StandardResponseItem> => {
    return request<StandardResponseItem>('/responses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateResponse: (id: number, data: StandardResponseUpdateInput): Promise<StandardResponseItem> => {
    return request<StandardResponseItem>(`/responses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteResponse: (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/responses/${id}`, {
      method: 'DELETE',
    });
  },

  copyResponse: (id: number): Promise<{ status: string; copies_count: number }> => {
    return request<{ status: string; copies_count: number }>(`/responses/${id}/copy`, {
      method: 'POST',
    });
  },
};
