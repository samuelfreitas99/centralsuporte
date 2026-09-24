export interface RecurrentEquipmentIssue {
  equipment_id: number;
  hostname: string;
  patrimony?: string | null;
  equipment_type: string;
  store_name?: string | null;
  incident_count: number;
  maintenance_count: number;
  total_events: number;
}

export interface TechnicianPerformanceMetric {
  technician_id: number;
  technician_name: string;
  resolved_attendances: number;
  completed_maintenances: number;
  total_actions: number;
}

export interface OperationalSummaryReport {
  period_days: number;
  total_attendances: number;
  resolved_attendances: number;
  attendance_resolution_rate: number;
  total_maintenances: number;
  completed_maintenances: number;
  total_maintenance_cost: number;
  recurrent_equipment: RecurrentEquipmentIssue[];
  technicians_performance: TechnicianPerformanceMetric[];
}
