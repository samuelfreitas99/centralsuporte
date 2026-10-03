export interface UserSimple {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  role_id?: number | null;
}

export interface ChecklistItem {
  id: number;
  checklist_id: number;
  title: string;
  is_completed: boolean;
  position: number;
  completed_at?: string | null;
  completed_by_id?: number | null;
  completed_by?: UserSimple | null;
}

export interface Checklist {
  id: number;
  title: string;
  description?: string | null;
  task_id?: number | null;
  creator_id: number;
  creator?: UserSimple | null;
  created_at: string;
  items: ChecklistItem[];
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  creator_id: number;
  creator?: UserSimple | null;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  due_date?: string | null;
  completed_at?: string | null;
  visibility: 'privado' | 'equipe' | 'todos';
  category?: string | null;
  otrs_reference?: string | null;
  created_at: string;
  updated_at: string;
  assigned_users: UserSimple[];
  checklists: Checklist[];
  project_id?: number | null;
  project_stage?: string | null;
}

export type TaskList = Omit<Task, 'description' | 'checklists'>;


export interface TaskCreatePayload {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  due_date?: string | null;
  visibility?: string;
  category?: string;
  otrs_reference?: string;
  assigned_user_ids?: number[];
  project_id?: number | null;
  project_stage?: string;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  due_date?: string | null;
  visibility?: string;
  category?: string;
  otrs_reference?: string;
  assigned_user_ids?: number[];
  project_id?: number | null;
  project_stage?: string | null;
}

export interface Reminder {
  id: number;
  title: string;
  description?: string | null;
  remind_at: string;
  user_id: number;
  priority: string;
  status: 'pendente' | 'concluido' | 'dispensado';
  /** manual = criado pelo usuário; automacao = alerta das regras automáticas */
  source?: 'manual' | 'automacao';
  task_id?: number | null;
  created_at: string;
}

export interface ReminderCreatePayload {
  title: string;
  description?: string;
  remind_at: string;
  priority?: string;
  status?: string;
  task_id?: number | null;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  event_type: 'atividade' | 'manutencao' | 'compromisso' | 'lembrete' | 'escala';
  user_id: number;
  created_at: string;
}

export interface CalendarEventCreatePayload {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type?: string;
}
