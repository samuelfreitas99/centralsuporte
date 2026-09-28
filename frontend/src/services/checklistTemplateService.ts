import { request } from './api';
import type {
  ChecklistTemplate,
  ChecklistTemplateCreate,
  ChecklistTemplateUpdate,
} from '../types/checklistTemplate';

export const checklistTemplateService = {
  async getTemplates(maintenanceType?: string): Promise<ChecklistTemplate[]> {
    const url = maintenanceType ? `/checklist-templates?maintenance_type=${maintenanceType}` : '/checklist-templates';
    return request<ChecklistTemplate[]>(url);
  },

  async getTemplate(id: number): Promise<ChecklistTemplate> {
    return request<ChecklistTemplate>(`/checklist-templates/${id}`);
  },

  async createTemplate(payload: ChecklistTemplateCreate): Promise<ChecklistTemplate> {
    return request<ChecklistTemplate>('/checklist-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateTemplate(id: number, payload: ChecklistTemplateUpdate): Promise<ChecklistTemplate> {
    return request<ChecklistTemplate>(`/checklist-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteTemplate(id: number): Promise<void> {
    await request<void>(`/checklist-templates/${id}`, {
      method: 'DELETE',
    });
  },
};
