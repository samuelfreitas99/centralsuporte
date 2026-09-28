export interface ChecklistTemplateItem {
  id: number;
  template_id: number;
  title: string;
  position: number;
}

export interface ChecklistTemplate {
  id: number;
  name: string;
  description?: string;
  maintenance_type: string;
  items: ChecklistTemplateItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplateCreate {
  name: string;
  description?: string;
  maintenance_type?: string;
  is_active?: boolean;
  items?: { title: string; position: number }[];
}

export interface ChecklistTemplateUpdate {
  name?: string;
  description?: string;
  maintenance_type?: string;
  is_active?: boolean;
  items?: { title: string; position: number }[];
}
