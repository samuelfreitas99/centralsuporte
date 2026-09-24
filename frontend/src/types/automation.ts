export interface AutomationRuleItem {
  id: string;
  name: string;
  description: string;
  category: string;
  frequency: string;
  is_active: boolean;
}

export interface AutomationTriggerResponse {
  executed_at: string;
  tasks_evaluated: number;
  task_reminders_created: number;
  maintenances_evaluated: number;
  maintenance_reminders_created: number;
  equipment_alerts_created: number;
  total_created: number;
  error?: string | null;
}

export interface AutomationStatusResponse {
  status: string;
  interval_minutes: number;
  last_run_at?: string | null;
  run_count: number;
  last_stats: Record<string, any>;
  active_rules_count: number;
}
