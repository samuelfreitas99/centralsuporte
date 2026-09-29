import { request } from './api';
import type {
  Project,
  ProjectCreatePayload,
  ProjectUpdatePayload,
  ProjectNote,
  ProjectNoteCreatePayload,
  ProjectSummary,
  ProjectTimelineEvent,
} from '../types/projects';

export const projectService = {
  getProjects: async (params?: { status?: string; store_id?: number }): Promise<Project[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.store_id) query.append('store_id', params.store_id.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<Project[]>(`/projects${queryString}`);
  },

  getProject: async (id: number): Promise<Project> => {
    return request<Project>(`/projects/${id}`);
  },

  createProject: async (payload: ProjectCreatePayload): Promise<Project> => {
    return request<Project>('/projects/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateProject: async (id: number, payload: ProjectUpdatePayload): Promise<Project> => {
    return request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteProject: async (id: number): Promise<void> => {
    await request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  // Notes
  getProjectNotes: async (projectId: number): Promise<ProjectNote[]> => {
    return request<ProjectNote[]>(`/projects/${projectId}/notes`);
  },

  createProjectNote: async (projectId: number, payload: ProjectNoteCreatePayload): Promise<ProjectNote> => {
    return request<ProjectNote>(`/projects/${projectId}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateProjectNote: async (projectId: number, noteId: number, payload: ProjectNoteCreatePayload): Promise<ProjectNote> => {
    return request<ProjectNote>(`/projects/${projectId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteProjectNote: async (projectId: number, noteId: number): Promise<void> => {
    await request<void>(`/projects/${projectId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  // Equipment
  addEquipment: async (projectId: number, equipmentId: number): Promise<void> => {
    await request<void>(`/projects/${projectId}/equipment/${equipmentId}`, {
      method: 'POST',
    });
  },

  removeEquipment: async (projectId: number, equipmentId: number): Promise<void> => {
    await request<void>(`/projects/${projectId}/equipment/${equipmentId}`, {
      method: 'DELETE',
    });
  },

  // Summary & Timeline
  getProjectSummary: async (projectId: number): Promise<ProjectSummary> => {
    return request<ProjectSummary>(`/projects/${projectId}/summary`);
  },

  getProjectTimeline: async (projectId: number): Promise<ProjectTimelineEvent[]> => {
    return request<ProjectTimelineEvent[]>(`/projects/${projectId}/timeline`);
  },
};
