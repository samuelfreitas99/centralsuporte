import { request } from './api';
import type { PaginatedResponse } from '../types/pagination';
import type {
  Task,
  TaskList,
  TaskCreatePayload,
  TaskUpdatePayload,
  Checklist,
  ChecklistItem,
  Reminder,
  ReminderCreatePayload,
  CalendarEvent,
  CalendarEventCreatePayload,
} from '../types/tasks';

export const organizationService = {
  // --- Tasks ---
  getTasks: async (params?: {
    status?: string;
    priority?: string;
    visibility?: string;
    category?: string;
    search?: string;
    assigned_to_me?: boolean;
    project_id?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TaskList>> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.visibility) query.append('visibility', params.visibility);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.assigned_to_me) query.append('assigned_to_me', 'true');
    if (params?.project_id !== undefined) query.append('project_id', params.project_id.toString());
    if (params?.page !== undefined) query.append('page', params.page.toString());
    if (params?.limit !== undefined) query.append('limit', params.limit.toString());

    const qs = query.toString();
    return request<PaginatedResponse<TaskList>>(`/tasks${qs ? `?${qs}` : ''}`);
  },

  getTaskById: async (id: number): Promise<Task> => {
    return request<Task>(`/tasks/${id}`);
  },

  createTask: async (payload: TaskCreatePayload): Promise<Task> => {
    return request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateTask: async (id: number, payload: TaskUpdatePayload): Promise<Task> => {
    return request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  updateTaskStatus: async (id: number, status: string): Promise<Task> => {
    return request<Task>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  deleteTask: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Checklists ---
  getChecklists: async (taskId?: number): Promise<Checklist[]> => {
    const qs = taskId ? `?task_id=${taskId}` : '';
    return request<Checklist[]>(`/checklists${qs}`);
  },

  createChecklist: async (payload: {
    title: string;
    description?: string;
    task_id?: number;
    items?: { title: string; position?: number }[];
  }): Promise<Checklist> => {
    return request<Checklist>('/checklists', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  addChecklistItem: async (checklistId: number, title: string, position?: number): Promise<ChecklistItem> => {
    return request<ChecklistItem>(`/checklists/${checklistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ title, position }),
    });
  },

  updateChecklistItem: async (
    checklistId: number,
    itemId: number,
    payload: { title?: string; is_completed?: boolean; position?: number }
  ): Promise<ChecklistItem> => {
    return request<ChecklistItem>(`/checklists/${checklistId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteChecklistItem: async (checklistId: number, itemId: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/checklists/${checklistId}/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  deleteChecklist: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/checklists/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Reminders ---
  getReminders: async (status?: string): Promise<Reminder[]> => {
    const qs = status ? `?status=${status}` : '';
    return request<Reminder[]>(`/reminders${qs}`);
  },

  createReminder: async (payload: ReminderCreatePayload): Promise<Reminder> => {
    return request<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateReminderStatus: async (id: number, status: string): Promise<Reminder> => {
    return request<Reminder>(`/reminders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  deleteReminder: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/reminders/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Calendar Events ---
  getCalendarEvents: async (): Promise<CalendarEvent[]> => {
    return request<CalendarEvent[]>('/calendar/events');
  },

  createCalendarEvent: async (payload: CalendarEventCreatePayload): Promise<CalendarEvent> => {
    return request<CalendarEvent>('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteCalendarEvent: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/calendar/events/${id}`, {
      method: 'DELETE',
    });
  },
};
