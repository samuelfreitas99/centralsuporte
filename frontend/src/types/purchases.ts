import type { UserSimple } from './tasks';

export type PurchaseStatus = 'aguardando_aprovacao' | 'aprovada' | 'rejeitada' | 'recebida' | 'cancelada';

export interface PurchaseQuote {
  id: number;
  supplier: string;
  unit_price: number;
  delivery_days?: number | null;
  link?: string | null;
  notes?: string | null;
  total: number;
}

export interface PurchaseRequest {
  id: number;
  title: string;
  reason?: string | null;
  quantity: number;
  status: PurchaseStatus;
  requester?: UserSimple | null;
  approver?: UserSimple | null;
  chosen_quote_id?: number | null;
  decision_note?: string | null;
  decided_at?: string | null;
  received_at?: string | null;
  stock_item_id?: number | null;
  stock_item_name?: string | null;
  project_id?: number | null;
  project_title?: string | null;
  quotes: PurchaseQuote[];
  best_total?: number | null;
  chosen_total?: number | null;
  can_edit: boolean;
  can_decide: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseQuoteInput {
  supplier: string;
  unit_price: number;
  delivery_days?: number | null;
  link?: string | null;
  notes?: string | null;
}

export interface PurchaseRequestInput {
  title: string;
  reason?: string | null;
  quantity: number;
  stock_item_id?: number | null;
  project_id?: number | null;
  quotes: PurchaseQuoteInput[];
}
