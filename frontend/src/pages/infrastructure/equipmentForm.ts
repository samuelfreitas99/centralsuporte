import type { EquipmentItem, EquipmentCreatePayload } from '@/types/infrastructure';

/** Converte um equipamento salvo nos valores do formulário de edição. */
export const equipmentToForm = (eq: EquipmentItem): EquipmentCreatePayload => ({
  patrimony: eq.patrimony || '',
  hostname: eq.hostname || '',
  equipment_type: eq.equipment_type,
  brand: eq.brand || '',
  model: eq.model || '',
  serial_number: eq.serial_number || '',
  ip_address: eq.ip_address || '',
  mac_address: eq.mac_address || '',
  operating_system: eq.operating_system || '',
  store_id: eq.store_id || null,
  department_id: eq.department_id || null,
  assigned_user: eq.assigned_user || '',
  status: eq.status,
  notes: eq.notes || '',
});
