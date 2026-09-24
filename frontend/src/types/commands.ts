
export interface CommandItem {
  id: number;
  title: string;
  description?: string | null;
  command: string;
  system: string;
  category?: string | null;
  tags?: string | null;
  notes?: string | null;
  warning?: string | null;
  visibility: 'equipe' | 'privado' | 'todos' | string;
  author_id: number;
  author?: {
    id: number;
    username: string;
    role?: {
      id: number;
      name: string;
    };
  } | null;
  copies_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommandCreateInput {
  title: string;
  description?: string;
  command: string;
  system?: string;
  category?: string;
  tags?: string;
  notes?: string;
  warning?: string;
  visibility?: string;
}

export interface CommandUpdateInput {
  title?: string;
  description?: string;
  command?: string;
  system?: string;
  category?: string;
  tags?: string;
  notes?: string;
  warning?: string;
  visibility?: string;
}

export interface StandardResponseItem {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  audience: 'usuario_final' | 'tecnico' | 'fornecedor' | string;
  tags?: string | null;
  visibility: 'equipe' | 'privado' | 'todos' | string;
  author_id: number;
  author?: {
    id: number;
    username: string;
    role?: {
      id: number;
      name: string;
    };
  } | null;
  copies_count: number;
  created_at: string;
  updated_at: string;
}

export interface StandardResponseCreateInput {
  title: string;
  content: string;
  category?: string;
  audience?: string;
  tags?: string;
  visibility?: string;
}

export interface StandardResponseUpdateInput {
  title?: string;
  content?: string;
  category?: string;
  audience?: string;
  tags?: string;
  visibility?: string;
}
