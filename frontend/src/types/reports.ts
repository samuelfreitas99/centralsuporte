/** Contrato de GET /reports/summary (fonte: backend/app/schemas.py — OperationalSummaryReport). */
export interface RecurrentEquipmentIssue {
  equipment_id: number;
  hostname?: string | null;
  patrimony?: string | null;
  store_name?: string | null;
  total_incidents: number;
  attendances_count: number;
  maintenances_count: number;
}

export interface TechnicianPerformanceMetric {
  technician_id: number;
  username: string;
  attendances_count: number;
  maintenances_count: number;
  total_actions: number;
}

export interface OperationalSummaryReport {
  period_days: number;
  attendances_total: number;
  attendances_resolved: number;
  attendances_in_progress: number;
  resolution_rate: number;
  maintenances_total: number;
  maintenances_preventive: number;
  maintenances_corrective: number;
  maintenances_total_cost: number;
  recurrent_equipment: RecurrentEquipmentIssue[];
  top_technicians: TechnicianPerformanceMetric[];
}
