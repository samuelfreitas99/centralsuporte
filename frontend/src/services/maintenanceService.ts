import { request } from './api';
import type {
  MaintenanceRecord,
  MaintenanceCreatePayload,
  MaintenanceUpdatePayload,
  MaintenanceStatusPayload,
  MaintenanceMetrics,
} from '@/types/maintenance';
import type { Checklist } from '@/types/tasks';

export const maintenanceService = {
  getMaintenances: (params?: {
    status?: string;
    maintenance_type?: string;
    priority?: string;
    equipment_id?: number;
    store_id?: number;
    technician_id?: number;
    search?: string;
    project_id?: number;
  }): Promise<MaintenanceRecord[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.maintenance_type) searchParams.append('maintenance_type', params.maintenance_type);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.equipment_id) searchParams.append('equipment_id', String(params.equipment_id));
    if (params?.store_id) searchParams.append('store_id', String(params.store_id));
    if (params?.technician_id) searchParams.append('technician_id', String(params.technician_id));
    if (params?.search) searchParams.append('search', params.search);
    if (params?.project_id !== undefined) searchParams.append('project_id', String(params.project_id));

    const queryString = searchParams.toString();
    const endpoint = `/maintenances${queryString ? `?${queryString}` : ''}`;
    return request<MaintenanceRecord[]>(endpoint);
  },

  getMaintenance: (id: number): Promise<MaintenanceRecord> => {
    return request<MaintenanceRecord>(`/maintenances/${id}`);
  },

  createMaintenance: (data: MaintenanceCreatePayload): Promise<MaintenanceRecord> => {
    return request<MaintenanceRecord>('/maintenances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateMaintenance: (id: number, data: MaintenanceUpdatePayload): Promise<MaintenanceRecord> => {
    return request<MaintenanceRecord>(`/maintenances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateStatus: (id: number, data: MaintenanceStatusPayload): Promise<MaintenanceRecord> => {
    return request<MaintenanceRecord>(`/maintenances/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteMaintenance: (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/maintenances/${id}`, {
      method: 'DELETE',
    });
  },

  addChecklist: (
    maintenanceId: number,
    data: { title: string; description?: string; items?: { title: string; position?: number }[] }
  ): Promise<Checklist> => {
    return request<Checklist>(`/maintenances/${maintenanceId}/checklists`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMetrics: (): Promise<MaintenanceMetrics> => {
    return request<MaintenanceMetrics>('/maintenances/metrics/summary');
  },

  toggleChecklistItem: (
    checklistId: number,
    itemId: number,
    isCompleted: boolean
  ): Promise<{ id: number; is_completed: boolean }> => {
    return request<{ id: number; is_completed: boolean }>(`/checklists/${checklistId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_completed: isCompleted }),
    });
  },
};
