import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { maintenanceService } from '@/services/maintenanceService';
import type { MaintenanceRecord, MaintenanceUpdatePayload } from '@/types/maintenance';
import type { EquipmentItem } from '@/types/infrastructure';
import { useToast } from '@/components/ui/Toast';


interface Props {
  isOpen: boolean;
  onClose: () => void;
  maintenance: MaintenanceRecord | null;
  equipmentList: EquipmentItem[];
  onSuccess: () => void;
}

export const MaintenanceEditDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  maintenance,
  equipmentList,
  onSuccess,
}) => {
  const { success, error: toastError } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<MaintenanceUpdatePayload>({});

  useEffect(() => {
    if (isOpen && maintenance) {
      setFormData({
        title: maintenance.title,
        equipment_id: maintenance.equipment?.id,
        maintenance_type: maintenance.maintenance_type,
        priority: maintenance.priority,
        status: maintenance.status,
        scheduled_date: maintenance.scheduled_date ? maintenance.scheduled_date.slice(0, 16) : undefined,
        description: maintenance.description || '',
        diagnosis: maintenance.diagnosis || '',
        procedure_performed: maintenance.procedure_performed || '',
        parts_used: maintenance.parts_used || '',
        otrs_ticket: maintenance.otrs_ticket || '',
        internal_notes: maintenance.internal_notes || '',
        result: maintenance.result || undefined,
        cost: maintenance.cost || undefined,
      });
    }
  }, [isOpen, maintenance]);

  const handleSave = async () => {
    if (!maintenance) return;
    setIsSaving(true);
    try {
      // Remove undefined or empty optional strings to not overwrite unnecessarily if it's tricky,
      // but payload.model_dump(exclude_unset=True) handles it on backend.
      await maintenanceService.updateMaintenance(maintenance.id, formData);
      success('Sucesso', 'Manutenção atualizada com sucesso');
      onSuccess();
      onClose();
    } catch (err) {
      toastError('Erro', 'Falha ao atualizar manutenção');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEquipmentChange = (eqId: number) => {
    const eq = equipmentList.find(e => e.id === eqId);
    if (!eq) return;
    setFormData({
      ...formData,
      equipment_id: eq.id,
      store_id: eq.store_id || undefined,
    });
  };

  if (!maintenance) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Manutenção</DialogTitle>
          <DialogDescription>Altere as informações do registro de manutenção (ID: {maintenance.id})</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Título *</label>
              <Input
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold">Equipamento *</label>
              <select
                value={formData.equipment_id || 0}
                onChange={e => handleEquipmentChange(Number(e.target.value))}
                className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs"
              >
                <option value={0}>Selecione um equipamento...</option>
                {equipmentList.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.hostname || eq.model} - {eq.patrimony}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Tipo</label>
              <select
                value={formData.maintenance_type || 'preventiva'}
                onChange={e => setFormData({ ...formData, maintenance_type: e.target.value })}
                className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs"
              >
                <option value="preventiva">Preventiva</option>
                <option value="corretiva">Corretiva</option>
                <option value="substituicao">Substituição</option>
                <option value="atualizacao">Atualização</option>
                <option value="configuracao">Configuração</option>
                <option value="instalacao">Instalação</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Prioridade</label>
              <select
                value={formData.priority || 'media'}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Status Atual</label>
              <select
                value={formData.status || 'agendada'}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs"
              >
                <option value="agendada">Agendada</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Data Agendada</label>
              <Input
                type="datetime-local"
                value={formData.scheduled_date || ''}
                onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold">Ticket OTRS</label>
              <Input
                value={formData.otrs_ticket || ''}
                onChange={e => setFormData({ ...formData, otrs_ticket: e.target.value })}
                placeholder="Ex: 202310150001"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Descrição do Problema</label>
              <textarea
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Diagnóstico</label>
              <textarea
                value={formData.diagnosis || ''}
                onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Procedimento Realizado</label>
              <textarea
                value={formData.procedure_performed || ''}
                onChange={e => setFormData({ ...formData, procedure_performed: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Peças / Materiais Utilizados</label>
              <textarea
                value={formData.parts_used || ''}
                onChange={e => setFormData({ ...formData, parts_used: e.target.value })}
                rows={2}
                placeholder="Descreva as peças e quantidades..."
                className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Observações Internas</label>
              <textarea
                value={formData.internal_notes || ''}
                onChange={e => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.title || !formData.equipment_id}>
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
