import { request } from './api';
import type { AuditLogListResponse, AuditMetadataResponse, AuditLogItem } from '@/types/audit';

export const auditService = {
  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    entity_type?: string;
    username?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AuditLogListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.action) searchParams.append('action', params.action);
    if (params?.entity_type) searchParams.append('entity_type', params.entity_type);
    if (params?.username) searchParams.append('username', params.username);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);

    const qs = searchParams.toString();
    return request<AuditLogListResponse>(`/audit-logs${qs ? `?${qs}` : ''}`);
  },

  getMetadata: (): Promise<AuditMetadataResponse> => {
    return request<AuditMetadataResponse>('/audit-logs/metadata');
  },

  getAuditLogById: (id: number): Promise<AuditLogItem> => {
    return request<AuditLogItem>(`/audit-logs/${id}`);
  },
};
