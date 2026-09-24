export interface AuditLogItem {
  id: number;
  user_id?: number | null;
  username?: string | null;
  action: string;
  entity_type: string;
  entity_id?: number | null;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  total: number;
  page: number;
  limit: number;
  results: AuditLogItem[];
}

export interface AuditMetadataResponse {
  actions: string[];
  entity_types: string[];
}
