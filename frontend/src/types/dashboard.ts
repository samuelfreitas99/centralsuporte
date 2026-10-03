export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida';

export interface DashboardTask {
  id: string;
  title: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueTime: string;
}

export interface DashboardReminder {
  id: string;
  text: string;
  time: string;
  type: 'turno' | 'sistema' | 'alerta';
}

export interface RecentAttendance {
  id: string;
  otrsTicket: string;
  title: string;
  technician: string;
  equipment?: string;
  status: string;
  updatedAt: string;
}

export interface QuickKnowledge {
  id: string;
  title: string;
  category: string;
  tags: string[];
  views: number;
}

export interface DashboardMetrics {
  pendingTasks: number;
  inProgressTasks: number;
  todayReminders: number;
  recentAttendances: number;
}

/** Resposta de GET /dashboard/summary. Seções `null` = usuário sem permissão para o módulo. */
export interface DashboardSummary {
  generated_at: string;
  tasks: { pending: number; in_progress: number; overdue: number; urgent: number; assigned_to_me: number } | null;
  attendances: { open: number; mine_open: number; today: number } | null;
  maintenances: { today: number; overdue: number; next_7_days: number } | null;
  low_stock_total: number | null;
  low_stock: { id: number; name: string; current_quantity: number; min_quantity: number; unit: string }[] | null;
  expiring_licenses_total: number | null;
  expiring_licenses: { id: number; name: string; expiration_date: string; days_left: number }[] | null;
  reminders_pending: number;
  knowledge_published: number | null;
}
