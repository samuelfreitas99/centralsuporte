import type { User } from './auth';
import type { StoreItem } from './infrastructure';

export interface Project {
  id: number;
  title: string;
  description?: string;
  status: string; // planejado, em_andamento, pausado, concluido, cancelado
  start_date?: string | null;
  /** Prazo previsto */
  expected_end_date?: string | null;
  /** Data real de conclusão */
  end_date?: string | null;
  owner_id?: number;
  owner?: User;
  store_id?: number;
  store?: StoreItem;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreatePayload {
  title: string;
  description?: string;
  status?: string;
  expected_end_date?: string;
  owner_id?: number;
  store_id?: number;
}

export interface ProjectUpdatePayload {
  title?: string;
  description?: string;
  status?: string;
  expected_end_date?: string;
  end_date?: string;
  owner_id?: number | null;
  store_id?: number | null;
}

export interface ProjectNote {
  id: number;
  project_id: number;
  author_id?: number;
  author?: User;
  note: string;
  created_at: string;
}

export interface ProjectNoteCreatePayload {
  note: string;
}

export interface ProjectSummary {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  progress_percentage: number;
  total_equipment: number;
  total_maintenances: number;
  total_attendances: number;
  total_events: number;
  total_stock_movements: number;
}

export interface ProjectTimelineEvent {
  id: number;
  type: string; // "note" | "audit"
  title: string;
  description?: string;
  author?: User;
  created_at: string;
}
