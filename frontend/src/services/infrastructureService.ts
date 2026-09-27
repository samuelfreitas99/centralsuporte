import { request } from './api';
import type {
  StoreItem,
  StoreCreatePayload,
  DepartmentItem,
  DepartmentCreatePayload,
  EquipmentItem,
  EquipmentCreatePayload,
  EquipmentHistoryItem,
  EquipmentHistoryCreatePayload,
  LicenseItem,
  LicenseCreatePayload,
  LicenseAssignmentItem,
  LicenseAssignmentCreatePayload,
  StockItem,
  StockItemCreatePayload,
  StockMovementItem,
  StockMovementCreatePayload,
  TechnicalLocationItem,
  TechnicalLocationCreatePayload,
} from '../types/infrastructure';

export const infrastructureService = {
  // --- Lojas ---
  getStores: async (status?: string): Promise<StoreItem[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<StoreItem[]>(`/infrastructure/stores${query}`);
  },

  createStore: async (payload: StoreCreatePayload): Promise<StoreItem> => {
    return request<StoreItem>('/infrastructure/stores', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStore: async (id: number, payload: Partial<StoreCreatePayload>): Promise<StoreItem> => {
    return request<StoreItem>(`/infrastructure/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },



  deleteStore: async (id: number): Promise<void> => {
    return request<void>(`/infrastructure/stores/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Departamentos ---
  getDepartments: async (storeId?: number): Promise<DepartmentItem[]> => {
    const query = storeId ? `?store_id=${storeId}` : '';
    return request<DepartmentItem[]>(`/infrastructure/departments${query}`);
  },

  createDepartment: async (payload: DepartmentCreatePayload): Promise<DepartmentItem> => {
    return request<DepartmentItem>('/infrastructure/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateDepartment: async (id: number, payload: Partial<DepartmentCreatePayload>): Promise<DepartmentItem> => {
    return request<DepartmentItem>(`/infrastructure/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },



  deleteDepartment: async (id: number): Promise<void> => {
    return request<void>(`/infrastructure/departments/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Locais Técnicos ---
  getLocations: async (params?: { store_id?: number; department_id?: number; location_type?: string; q?: string }): Promise<TechnicalLocationItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.store_id) searchParams.append('store_id', params.store_id.toString());
    if (params?.department_id) searchParams.append('department_id', params.department_id.toString());
    if (params?.location_type) searchParams.append('location_type', params.location_type);
    if (params?.q) searchParams.append('q', params.q);

    const qs = searchParams.toString();
    return request<TechnicalLocationItem[]>(`/infrastructure/locations${qs ? `?${qs}` : ''}`);
  },

  createLocation: async (payload: TechnicalLocationCreatePayload): Promise<TechnicalLocationItem> => {
    return request<TechnicalLocationItem>('/infrastructure/locations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateLocation: async (id: number, payload: Partial<TechnicalLocationCreatePayload>): Promise<TechnicalLocationItem> => {
    return request<TechnicalLocationItem>(`/infrastructure/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteLocation: async (id: number): Promise<void> => {
    return request<void>(`/infrastructure/locations/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Equipamentos ---
  getEquipment: async (params?: {
    q?: string;
    store_id?: number;
    department_id?: number;
    technical_location_id?: number;
    equipment_type?: string;
    status?: string;
  }): Promise<EquipmentItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.append('q', params.q);
    if (params?.store_id) searchParams.append('store_id', params.store_id.toString());
    if (params?.department_id) searchParams.append('department_id', params.department_id.toString());
    if (params?.technical_location_id) searchParams.append('technical_location_id', params.technical_location_id.toString());
    if (params?.equipment_type) searchParams.append('equipment_type', params.equipment_type);
    if (params?.status) searchParams.append('status', params.status);

    const qs = searchParams.toString();
    return request<EquipmentItem[]>(`/infrastructure/equipment${qs ? `?${qs}` : ''}`);
  },

  getEquipmentById: async (id: number): Promise<EquipmentItem> => {
    return request<EquipmentItem>(`/infrastructure/equipment/${id}`);
  },

  createEquipment: async (payload: EquipmentCreatePayload): Promise<EquipmentItem> => {
    return request<EquipmentItem>('/infrastructure/equipment', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateEquipment: async (id: number, payload: Partial<EquipmentCreatePayload>): Promise<EquipmentItem> => {
    return request<EquipmentItem>(`/infrastructure/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteEquipment: async (id: number): Promise<void> => {
    return request<void>(`/infrastructure/equipment/${id}`, {
      method: 'DELETE',
    });
  },

  addEquipmentHistory: async (
    equipmentId: number,
    payload: EquipmentHistoryCreatePayload
  ): Promise<EquipmentHistoryItem> => {
    return request<EquipmentHistoryItem>(`/infrastructure/equipment/${equipmentId}/history`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // --- Licenças de Software ---
  getLicenses: async (status?: string): Promise<LicenseItem[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<LicenseItem[]>(`/infrastructure/licenses${query}`);
  },

  createLicense: async (payload: LicenseCreatePayload): Promise<LicenseItem> => {
    return request<LicenseItem>('/infrastructure/licenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateLicense: async (id: number, payload: Partial<LicenseCreatePayload>): Promise<LicenseItem> => {
    return request<LicenseItem>(`/infrastructure/licenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteLicense: async (id: number): Promise<void> => {
    return request<void>(`/infrastructure/licenses/${id}`, {
      method: 'DELETE',
    });
  },

  assignLicenseSeat: async (licenseId: number, payload: LicenseAssignmentCreatePayload): Promise<LicenseAssignmentItem> => {
    return request<LicenseAssignmentItem>(`/infrastructure/licenses/${licenseId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  revokeLicenseSeat: async (licenseId: number, assignmentId: number): Promise<void> => {
    return request<void>(`/infrastructure/licenses/${licenseId}/assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  },

  revealLicenseKey: async (licenseId: number): Promise<{ license_key: string }> => {
    return request<{ license_key: string }>(`/infrastructure/licenses/${licenseId}/reveal`, {
      method: 'POST',
    });
  },

  // --- Estoque Operacional ---
  getStockItems: async (params?: { q?: string; category?: string; low_stock_only?: boolean }): Promise<StockItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.append('q', params.q);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.low_stock_only) searchParams.append('low_stock_only', 'true');

    const qs = searchParams.toString();
    return request<StockItem[]>(`/infrastructure/stock/items${qs ? `?${qs}` : ''}`);
  },

  createStockItem: async (payload: StockItemCreatePayload): Promise<StockItem> => {
    return request<StockItem>('/infrastructure/stock/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStockItem: async (id: number, payload: Partial<StockItemCreatePayload>): Promise<StockItem> => {
    return request<StockItem>(`/infrastructure/stock/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteStockItem: async (id: number): Promise<void> => {
    return request<void>(`/infrastructure/stock/items/${id}`, {
      method: 'DELETE',
    });
  },

  registerStockMovement: async (
    stockItemId: number,
    payload: StockMovementCreatePayload
  ): Promise<StockMovementItem> => {
    return request<StockMovementItem>(`/infrastructure/stock/items/${stockItemId}/movements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
