import type { UserSimple } from './tasks';

export interface KnowledgeCategory {
  id: number;
  name: string;
  description?: string | null;
  color?: string;
  articles_count?: number;
  created_at: string;
}

export interface KnowledgeCategoryCreatePayload {
  name: string;
  description?: string;
  color?: string;
}

export interface KnowledgeCategoryUpdatePayload {
  name?: string;
  description?: string;
  color?: string;
}

export interface KnowledgeTag {
  id: number;
  name: string;
  created_at: string;
}

export interface KnowledgeVersion {
  id: number;
  article_id: number;
  version_number: number;
  title: string;
  content: string;
  change_summary?: string | null;
  editor_id?: number | null;
  editor?: UserSimple | null;
  created_at: string;
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  summary?: string | null;
  content: string;
  problem?: string | null;
  solution?: string | null;
  commands?: string | null;
  category_id?: number | null;
  category?: KnowledgeCategory | null;
  author_id: number;
  author?: UserSimple | null;
  status: 'rascunho' | 'publicado' | 'arquivado';
  visibility: 'privado' | 'equipe' | 'todos';
  views_count: number;
  created_at: string;
  updated_at: string;
  tags: KnowledgeTag[];
  versions: KnowledgeVersion[];
  is_favorite?: boolean;
}

export interface KnowledgeArticleCreatePayload {
  title: string;
  summary?: string;
  content: string;
  problem?: string;
  solution?: string;
  commands?: string;
  category_id?: number | null;
  status?: string;
  visibility?: string;
  tag_names?: string[];
}

export interface KnowledgeArticleUpdatePayload {
  title?: string;
  summary?: string;
  content?: string;
  problem?: string;
  solution?: string;
  commands?: string;
  category_id?: number | null;
  status?: string;
  visibility?: string;
  tag_names?: string[];
  change_summary?: string;
}
