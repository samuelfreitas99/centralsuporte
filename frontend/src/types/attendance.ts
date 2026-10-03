export interface AttendanceNoteItem {
  id: number;
  attendance_id: number;
  author_id: number;
  author?: {
    id: number;
    username: string;
    role?: {
      id: number;
      name: string;
    };
  } | null;
  note: string;
  created_at: string;
}

export interface AttendanceItem {
  id: number;
  title: string;
  otrs_ticket?: string | null;
  otrs_url?: string | null;
  requester_name?: string | null;
  technician_id: number;
  technician?: {
    id: number;
    username: string;
    role?: {
      id: number;
      name: string;
    };
  } | null;
  status: 'em_andamento' | 'resolvido' | 'cancelado' | string;
  equipment_name?: string | null;
  equipment_id?: number | null;
  store_department?: string | null;
  problem_description?: string | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  cause?: string | null;
  solution?: string | null;
  commands_used?: string | null;
  internal_notes?: string | null;
  knowledge_article_id?: number | null;
  notes: AttendanceNoteItem[];
  project_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceCreateInput {
  title: string;
  otrs_ticket?: string;
  otrs_url?: string;
  requester_name?: string;
  technician_id?: number;
  status?: string;
  equipment_name?: string;
  equipment_id?: number | null;
  store_department?: string;
  problem_description?: string;
  symptoms?: string;
  diagnosis?: string;
  cause?: string;
  solution?: string;
  commands_used?: string;
  internal_notes?: string;
  project_id?: number | null;
}

export interface AttendanceUpdateInput {
  title?: string;
  otrs_ticket?: string;
  otrs_url?: string;
  requester_name?: string;
  technician_id?: number;
  status?: string;
  equipment_name?: string;
  equipment_id?: number | null;
  store_department?: string;
  problem_description?: string;
  symptoms?: string;
  diagnosis?: string;
  cause?: string;
  solution?: string;
  commands_used?: string;
  internal_notes?: string;
  project_id?: number | null;
}
