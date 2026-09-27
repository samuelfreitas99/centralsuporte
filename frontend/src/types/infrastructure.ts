export interface StoreItem {
  id: number;
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  status: 'ativa' | 'inativa' | 'reforma';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreCreatePayload {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  status?: string;
  notes?: string;
}

export interface DepartmentItem {
  id: number;
  name: string;
  store_id?: number | null;
  store?: StoreItem | null;
  description?: string | null;
  created_at: string;
}

export interface DepartmentCreatePayload {
  name: string;
  store_id?: number | null;
  description?: string;
}

export interface TechnicalLocationItem {
  id: number;
  name: string;
  location_type: string;
  store_id: number;
  store?: StoreItem | null;
  department_id?: number | null;
  department?: DepartmentItem | null;
  description?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechnicalLocationCreatePayload {
  name: string;
  location_type: string;
  store_id: number;
  department_id?: number | null;
  description?: string;
  notes?: string;
}

export interface EquipmentHistoryItem {
  id: number;
  equipment_id: number;
  user_id?: number | null;
  user?: {
    id: number;
    username: string;
  } | null;
  event_type: string;
  description: string;
  created_at: string;
}

export interface EquipmentHistoryCreatePayload {
  event_type: string;
  description: string;
}

export type EquipmentType =
  | 'computador'
  | 'notebook'
  | 'pdv'
  | 'impressora'
  | 'switch'
  | 'access_point'
  | 'roteador'
  | 'firewall'
  | 'servidor'
  | 'monitor'
  | 'nobreak'
  | 'outro';

export type EquipmentStatus = 'ativo' | 'em_manutencao' | 'reserva' | 'descartado';

export interface EquipmentItem {
  id: number;
  patrimony?: string | null;
  hostname?: string | null;
  equipment_type: EquipmentType;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  ip_address?: string | null;
  mac_address?: string | null;
  operating_system?: string | null;
  store_id?: number | null;
  store?: StoreItem | null;
  department_id?: number | null;
  department?: DepartmentItem | null;
  technical_location_id?: number | null;
  technical_location?: TechnicalLocationItem | null;
  assigned_user?: string | null;
  status: EquipmentStatus;
  notes?: string | null;
  history?: EquipmentHistoryItem[];
  created_at: string;
  updated_at: string;
}

export interface EquipmentCreatePayload {
  patrimony?: string;
  hostname?: string;
  equipment_type: EquipmentType;
  brand?: string;
  model?: string;
  serial_number?: string;
  ip_address?: string;
  mac_address?: string;
  operating_system?: string;
  store_id?: number | null;
  department_id?: number | null;
  technical_location_id?: number | null;
  assigned_user?: string;
  status?: EquipmentStatus;
  notes?: string;
}

export interface LicenseAssignmentItem {
  id: number;
  license_id: number;
  equipment_id?: number | null;
  assigned_to: string;
  notes?: string | null;
  assigned_at: string;
}

export interface LicenseAssignmentCreatePayload {
  equipment_id?: number | null;
  assigned_to: string;
  notes?: string;
}

export interface LicenseItem {
  id: number;
  name: string;
  license_type: 'perpetua' | 'saas' | 'volume' | 'oem' | 'open_source';
  vendor?: string | null;
  license_key?: string | null;
  account_email?: string | null;
  total_seats: number;
  used_seats?: number;
  cost?: number | null;
  expiration_date?: string | null;
  status: 'ativa' | 'vencida' | 'cancelada';
  notes?: string | null;
  assignments?: LicenseAssignmentItem[];
  created_at: string;
  updated_at: string;
}

export interface LicenseCreatePayload {
  name: string;
  license_type?: string;
  vendor?: string;
  license_key?: string;
  account_email?: string;
  total_seats: number;
  cost?: number | null;
  expiration_date?: string | null;
  status?: string;
  notes?: string;
}

export interface StockMovementItem {
  id: number;
  stock_item_id: number;
  user_id?: number | null;
  user?: {
    id: number;
    username: string;
  } | null;
  movement_type: 'entrada' | 'saida' | 'transferencia' | 'baixa' | 'devolucao';
  quantity: number;
  store_id?: number | null;
  attendance_id?: number | null;
  reason?: string | null;
  created_at: string;
}

export interface StockItem {
  id: number;
  name: string;
  category: 'perifericos' | 'suprimentos' | 'redes' | 'pecas' | 'cabos' | 'outros';
  part_number?: string | null;
  current_quantity: number;
  min_quantity: number;
  unit: string;
  location?: string | null;
  notes?: string | null;
  is_low_stock?: boolean;
  movements?: StockMovementItem[];
  created_at: string;
  updated_at: string;
}

export interface StockItemCreatePayload {
  name: string;
  category?: string;
  part_number?: string;
  current_quantity?: number;
  min_quantity?: number;
  unit?: string;
  location?: string;
  notes?: string;
}

export interface StockMovementCreatePayload {
  movement_type: string;
  quantity: number;
  store_id?: number | null;
  attendance_id?: number | null;
  reason?: string;
}
