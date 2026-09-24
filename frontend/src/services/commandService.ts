import { request } from './api';
import type {
  CommandItem,
  CommandCreateInput,
  CommandUpdateInput,
} from '@/types/commands';

export const commandService = {
  getCommands: (params?: { system?: string; category?: string; search?: string }): Promise<CommandItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.system) searchParams.append('system', params.system);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.search) searchParams.append('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = `/commands${queryString ? `?${queryString}` : ''}`;
    return request<CommandItem[]>(endpoint);
  },

  getSystems: (): Promise<string[]> => {
    return request<string[]>('/commands/systems');
  },

  getCategories: (): Promise<string[]> => {
    return request<string[]>('/commands/categories');
  },

  getCommand: (id: number): Promise<CommandItem> => {
    return request<CommandItem>(`/commands/${id}`);
  },

  createCommand: (data: CommandCreateInput): Promise<CommandItem> => {
    return request<CommandItem>('/commands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCommand: (id: number, data: CommandUpdateInput): Promise<CommandItem> => {
    return request<CommandItem>(`/commands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCommand: (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/commands/${id}`, {
      method: 'DELETE',
    });
  },

  copyCommand: (id: number): Promise<{ status: string; copies_count: number }> => {
    return request<{ status: string; copies_count: number }>(`/commands/${id}/copy`, {
      method: 'POST',
    });
  },
};
