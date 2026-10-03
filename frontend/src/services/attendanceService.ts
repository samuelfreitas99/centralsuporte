import { request } from './api';
import type { PaginatedResponse } from '@/types/pagination';
import type {
  AttendanceItem,
  AttendanceNoteItem,
  AttendanceCreateInput,
  AttendanceUpdateInput,
} from '@/types/attendance';

export const attendanceService = {
  getAttendances: (params?: {
    status?: string;
    technician_id?: number;
    has_otrs?: boolean;
    search?: string;
    project_id?: number;
    equipment_id?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AttendanceItem>> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.technician_id) searchParams.append('technician_id', String(params.technician_id));
    if (params?.has_otrs !== undefined) searchParams.append('has_otrs', String(params.has_otrs));
    if (params?.search) searchParams.append('search', params.search);
    if (params?.project_id !== undefined) searchParams.append('project_id', String(params.project_id));
    if (params?.equipment_id !== undefined) searchParams.append('equipment_id', String(params.equipment_id));
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const queryString = searchParams.toString();
    const endpoint = `/attendances${queryString ? `?${queryString}` : ''}`;
    // Itens da listagem não trazem `notes` (use getAttendance para o detalhe).
    return request<PaginatedResponse<AttendanceItem>>(endpoint);
  },

  getAttendance: (id: number): Promise<AttendanceItem> => {
    return request<AttendanceItem>(`/attendances/${id}`);
  },

  createAttendance: (data: AttendanceCreateInput): Promise<AttendanceItem> => {
    return request<AttendanceItem>('/attendances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAttendance: (id: number, data: AttendanceUpdateInput): Promise<AttendanceItem> => {
    return request<AttendanceItem>(`/attendances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAttendance: (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/attendances/${id}`, {
      method: 'DELETE',
    });
  },

  addNote: (attendanceId: number, note: string): Promise<AttendanceNoteItem> => {
    return request<AttendanceNoteItem>(`/attendances/${attendanceId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  convertToKnowledge: (attendanceId: number): Promise<{ id: number; title: string; status: string }> => {
    return request<{ id: number; title: string; status: string }>(
      `/attendances/${attendanceId}/convert-to-knowledge`,
      {
        method: 'POST',
      }
    );
  },
};
