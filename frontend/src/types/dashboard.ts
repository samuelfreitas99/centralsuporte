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
