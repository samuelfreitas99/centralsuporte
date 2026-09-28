import type { UserSimple, Checklist } from './tasks';
import type { EquipmentItem, StoreItem } from './infrastructure';

export type MaintenanceType =
  | 'preventiva'
  | 'corretiva'
  | 'substituicao'
  | 'atualizacao'
  | 'configuracao'
  | 'instalacao'
  | 'outro';

export type MaintenanceStatus =
  | 'agendada'
  | 'em_andamento'
  | 'concluida'
  | 'cancelada';

export type MaintenancePriority =
  | 'baixa'
  | 'media'
  | 'alta'
  | 'urgente';

export type MaintenanceResult =
  | 'sucesso'
  | 'parcial'
  | 'falha';

export interface MaintenanceRecord {
  id: number;
  title: string;
  equipment_id: number;
  store_id?: number | null;
  technician_id?: number | null;
  maintenance_type: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  scheduled_date?: string | null;
  performed_date?: string | null;
  description?: string | null;
  diagnosis?: string | null;
  procedure_performed?: string | null;
  result?: MaintenanceResult | null;
  parts_used?: string | null;
  otrs_ticket?: string | null;
  attendance_id?: number | null;
  cost?: number | null;
  internal_notes?: string | null;
  equipment?: EquipmentItem | null;
  store?: StoreItem | null;
  technician?: UserSimple | null;
  checklists: Checklist[];
  created_at: string;
  updated_at: string;
}

export interface MaintenanceCreatePayload {
  title: string;
  equipment_id: number;
  store_id?: number | null;
  technician_id?: number | null;
  maintenance_type: string;
  status?: string;
  priority?: string;
  scheduled_date?: string | null;
  performed_date?: string | null;
  description?: string;
  diagnosis?: string;
  procedure_performed?: string;
  result?: string;
  parts_used?: string;
  otrs_ticket?: string;
  attendance_id?: number | null;
  cost?: number | null;
  internal_notes?: string;
  checklist_title?: string;
  checklist_items?: string[];
  checklist_template_id?: number;
}

export interface MaintenanceUpdatePayload {
  title?: string;
  equipment_id?: number;
  store_id?: number | null;
  technician_id?: number | null;
  maintenance_type?: string;
  status?: string;
  priority?: string;
  scheduled_date?: string | null;
  performed_date?: string | null;
  description?: string;
  diagnosis?: string;
  procedure_performed?: string;
  result?: string;
  parts_used?: string;
  otrs_ticket?: string;
  attendance_id?: number | null;
  cost?: number | null;
  internal_notes?: string;
}

export interface MaintenanceStatusPayload {
  status: string;
  result?: string;
  procedure_performed?: string;
  performed_date?: string;
}

export interface MaintenanceMetrics {
  total: number;
  agendadas: number;
  em_andamento: number;
  concluidas: number;
  preventivas: number;
  corretivas: number;
}
