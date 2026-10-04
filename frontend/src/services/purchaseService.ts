import { request } from './api';
import type { PurchaseRequest, PurchaseRequestInput } from '@/types/purchases';

const post = (path: string, body?: unknown) =>
  request<PurchaseRequest>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const purchaseService = {
  list: (params?: { status_filter?: string; search?: string; mine?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.status_filter) q.append('status_filter', params.status_filter);
    if (params?.search) q.append('search', params.search);
    if (params?.mine) q.append('mine', 'true');
    const qs = q.toString();
    return request<PurchaseRequest[]>(`/purchases${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) => request<PurchaseRequest>(`/purchases/${id}`),
  create: (data: PurchaseRequestInput) => post('/purchases', data),
  update: (id: number, data: PurchaseRequestInput) =>
    request<PurchaseRequest>(`/purchases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approve: (id: number, quoteId: number, note?: string) => post(`/purchases/${id}/approve`, { quote_id: quoteId, note }),
  reject: (id: number, note: string) => post(`/purchases/${id}/reject`, { note }),
  receive: (id: number) => post(`/purchases/${id}/receive`),
  cancel: (id: number) => post(`/purchases/${id}/cancel`),
};
