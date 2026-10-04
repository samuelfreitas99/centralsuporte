import type { UserSimple } from './tasks';

export type VaultVisibility = 'equipe' | 'pessoal';

/** Metadados de uma credencial (a API nunca devolve usuário/senha/notas na listagem). */
export interface VaultEntry {
  id: number;
  title: string;
  system_url?: string | null;
  category?: string | null;
  visibility: VaultVisibility;
  store_id?: number | null;
  equipment_id?: number | null;
  owner_id: number;
  owner?: UserSimple | null;
  store_name?: string | null;
  equipment_name?: string | null;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
}

export interface VaultSecret {
  username?: string | null;
  password: string;
  notes?: string | null;
}

export interface VaultEntryInput {
  title: string;
  system_url?: string | null;
  category?: string | null;
  visibility: VaultVisibility;
  store_id?: number | null;
  equipment_id?: number | null;
  username?: string | null;
  /** Na edição, omita para manter a senha atual. */
  password?: string;
  notes?: string | null;
}
