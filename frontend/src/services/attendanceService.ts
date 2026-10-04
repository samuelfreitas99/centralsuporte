import { request } from './api';
import type { PaginatedResponse } from '@/types/pagination';
import type {
  AttendanceItem,
  AttendanceNoteItem,
  AttendanceCreateInput,
  AttendanceUpdateInput,
  AttendanceContext,
  AttendanceTemplate,
  AttendanceTemplateInput,
} from '@/types/attendance';

export const attendanceService = {
  /** Atendimentos do mesmo chamado OTRS e histórico do equipamento (contexto do formulário). */
  getContext: (params: { otrs_ticket?: string; equipment_id?: number | null; exclude_id?: number }) => {
    const q = new URLSearchParams();
    if (params.otrs_ticket) q.append('otrs_ticket', params.otrs_ticket);
    if (params.equipment_id) q.append('equipment_id', String(params.equipment_id));
    if (params.exclude_id) q.append('exclude_id', String(params.exclude_id));
    return request<AttendanceContext>(`/attendances/context?${q.toString()}`);
  },

  getTemplates: () => request<AttendanceTemplate[]>('/attendance-templates'),
  createTemplate: (data: AttendanceTemplateInput) =>
    request<AttendanceTemplate>('/attendance-templates', { method: 'POST', body: JSON.stringify(data) }),
  deleteTemplate: (id: number) => request<void>(`/attendance-templates/${id}`, { method: 'DELETE' }),

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
