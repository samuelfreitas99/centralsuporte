import type { EquipmentItem } from '@/types/infrastructure';

/** Nome curto de um equipamento: "hostname · patrimônio" (igual ao gerado pelo backend em atendimentos). */
export const equipmentLabel = (eq: Pick<EquipmentItem, 'id' | 'hostname' | 'patrimony'>) =>
  [eq.hostname, eq.patrimony].filter(Boolean).join(' · ') || `Equipamento #${eq.id}`;
