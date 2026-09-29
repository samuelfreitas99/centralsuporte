import { request } from './api';
import type { Role, RoleCreatePayload, RoleUpdatePayload, Permission } from '@/types/auth';

export const roleService = {
  getRoles: async (): Promise<Role[]> => {
    return request<Role[]>('/roles');
  },

  createRole: async (payload: RoleCreatePayload): Promise<Role> => {
    return request<Role>('/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRole: async (id: number, payload: RoleUpdatePayload): Promise<Role> => {
    return request<Role>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getPermissions: async (): Promise<Permission[]> => {
    return request<Permission[]>('/permissions');
  },
};
