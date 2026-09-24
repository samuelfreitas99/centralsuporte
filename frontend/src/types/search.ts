export type SearchEntityType =
  | 'knowledge'
  | 'command'
  | 'attendance'
  | 'equipment'
  | 'maintenance'
  | 'task';

export interface SearchResultItem {
  id: number;
  entity_type: SearchEntityType;
  title: string;
  snippet: string;
  badge?: string | null;
  created_at?: string | null;
  url_tab: string;
  metadata?: Record<string, any>;
}

export interface GlobalSearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}
