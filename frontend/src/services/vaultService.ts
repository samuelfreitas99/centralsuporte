import { request } from './api';
import type { VaultEntry, VaultEntryInput, VaultSecret } from '@/types/vault';

export const vaultService = {
  status: () => request<{ configured: boolean }>('/vault/status'),
  list: (params?: { search?: string; visibility?: string; equipment_id?: number; store_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.visibility) q.append('visibility', params.visibility);
    if (params?.equipment_id) q.append('equipment_id', String(params.equipment_id));
    if (params?.store_id) q.append('store_id', String(params.store_id));
    const qs = q.toString();
    return request<VaultEntry[]>(`/vault${qs ? `?${qs}` : ''}`);
  },
  create: (data: VaultEntryInput) => request<VaultEntry>('/vault', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<VaultEntryInput>) =>
    request<VaultEntry>(`/vault/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/vault/${id}`, { method: 'DELETE' }),
  /** Decifra no servidor; cada chamada fica registrada na auditoria. */
  reveal: (id: number) => request<VaultSecret>(`/vault/${id}/reveal`, { method: 'POST' }),
};
