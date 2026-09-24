import { getApiBase, request } from './api';
import type { AttachmentItem, AttachmentUploadPayload } from '../types/attachment';

export const attachmentService = {
  async getAttachments(entityType?: string, entityId?: number): Promise<AttachmentItem[]> {
    const params = new URLSearchParams();
    if (entityType) params.append('entity_type', entityType);
    if (entityId !== undefined && entityId !== null) params.append('entity_id', String(entityId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<AttachmentItem[]>(`/attachments${qs}`);
  },

  async getAttachment(id: number): Promise<AttachmentItem> {
    return request<AttachmentItem>(`/attachments/${id}`);
  },

  async uploadAttachment(payload: AttachmentUploadPayload): Promise<AttachmentItem> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('entity_type', payload.entity_type);
    formData.append('entity_id', String(payload.entity_id));
    if (payload.description) {
      formData.append('description', payload.description);
    }

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiBase()}/attachments/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorDetail = `Erro HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorDetail = errorJson.detail;
        }
      } catch {
        // response wasn't JSON
      }
      throw new Error(errorDetail);
    }

    return response.json();
  },

  async downloadAttachment(id: number, filename: string): Promise<void> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiBase()}/attachments/${id}/download`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erro ao baixar arquivo: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  getPreviewUrl(id: number): string {
    return `${getApiBase()}/attachments/${id}/preview`;
  },

  async fetchPreviewBlobUrl(id: number): Promise<string> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiBase()}/attachments/${id}/preview`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erro ao carregar preview: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return window.URL.createObjectURL(blob);
  },

  async deleteAttachment(id: number): Promise<void> {
    await request<{ detail: string }>(`/attachments/${id}`, {
      method: 'DELETE',
    });
  },
};
