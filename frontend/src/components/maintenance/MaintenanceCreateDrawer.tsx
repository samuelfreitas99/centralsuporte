import React, { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
  DrawerClose
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectSelect } from '@/components/projects/ProjectSelect';
import { EquipmentMultiSelect } from '@/components/maintenance/EquipmentMultiSelect';
import { X, Plus, Save, Trash2, CheckSquare } from 'lucide-react';
import type { MaintenanceCreatePayload } from '@/types/maintenance';
import type { EquipmentItem } from '@/types/infrastructure';
import type { ChecklistTemplate } from '@/types/checklistTemplate';
import { maintenanceService } from '@/services/maintenanceService';
import { useToast } from '@/components/ui/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipmentList: EquipmentItem[];
  checklistTemplates: ChecklistTemplate[];
  onSuccess: (newMaintenance: any) => void;
  initialProjectId?: number | null;
  initialProjectName?: string;
  /** Equipamentos já selecionados ao abrir (ex.: "Agendar manutenção" na ficha do equipamento). */
  initialEquipmentIds?: number[];
}

export const MaintenanceCreateDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  equipmentList,
  checklistTemplates,
  onSuccess,
  initialProjectId,
  initialProjectName,
  initialEquipmentIds = [],
}) => {
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // Progressive disclosure

  const initialForm: MaintenanceCreatePayload = {
    title: '',
    equipment_id: initialEquipmentIds[0] || 0,
    equipment_ids: initialEquipmentIds,
    store_id: equipmentList.find((e) => e.id === initialEquipmentIds[0])?.store_id || null,
    maintenance_type: 'preventiva',
    priority: 'media',
    status: 'agendada',
    scheduled_date: '',
    description: '',
    checklist_title: 'Checklist Preventiva',
    checklist_items: [],
    checklist_template_id: undefined,
    attendance_id: null,
    project_id: initialProjectId || null,
  };

  const [form, setForm] = useState<MaintenanceCreatePayload>(initialForm);
  const [newChecklistItemInput, setNewChecklistItemInput] = useState('');

  // Handle Close & Reset
  const handleClose = () => {
    setForm(initialForm);
    setStep(1);
    onClose();
  };

  const handleEquipmentsChange = (eqIds: number[]) => {
    const primaryEq = equipmentList.find(e => eqIds.includes(e.id));
    setForm({
      ...form,
      equipment_ids: eqIds,
      equipment_id: eqIds[0] || 0,
      store_id: primaryEq?.store_id || null,
    });
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItemInput.trim()) return;
    setForm({
      ...form,
      checklist_items: [...(form.checklist_items || []), newChecklistItemInput.trim()],
    });
    setNewChecklistItemInput('');
  };

  const handleRemoveChecklistItem = (index: number) => {
    setForm({
      ...form,
      checklist_items: (form.checklist_items || []).filter((_, idx) => idx !== index),
    });
  };

  const handleSubmit = async () => {
    const selectedCount = form.equipment_ids?.length || (form.equipment_id ? 1 : 0);
    if (!form.title.trim() || selectedCount === 0) {
      toastError('Campos obrigatórios', 'Preencha o título e selecione pelo menos um equipamento.');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await maintenanceService.createMaintenance(form);
      success('Manutenção Registrada', `Manutenção "${created.title}" agendada com sucesso.`);
      onSuccess(created);
      handleClose();
    } catch {
      toastError('Erro ao agendar', 'Não foi possível agendar o registro de manutenção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerContent side="right" size="lg" className="h-full rounded-none">
          <DrawerHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
            <div>
              <DrawerTitle className="text-lg font-semibold">Nova Manutenção</DrawerTitle>
              <DrawerDescription>Agende ou registre uma nova manutenção no parque</DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Step Indicators */}
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              <span className={`px-2 py-1 rounded-md transition-colors ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                1. Essencial
              </span>
              <span className="text-border">/</span>
              <span className={`px-2 py-1 rounded-md transition-colors ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2. Detalhes (Opcional)
              </span>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Título *</label>
                    <Input
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="Ex: Preventiva Semestral PDV"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Equipamentos *</label>
                    <EquipmentMultiSelect
                      selectedIds={form.equipment_ids || (form.equipment_id ? [form.equipment_id] : [])}
                      onChange={handleEquipmentsChange}
                      equipmentList={equipmentList}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">Tipo</label>
                      <select
                        value={form.maintenance_type}
                        onChange={e => setForm({ ...form, maintenance_type: e.target.value })}
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
                        value={form.priority}
                        onChange={e => setForm({ ...form, priority: e.target.value })}
                        className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs"
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Data Agendada</label>
                    <Input
                      type="datetime-local"
                      value={form.scheduled_date || ''}
                      onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Descrição (Opcional)</label>
                    <textarea
                      value={form.description || ''}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs"
                      placeholder="Descreva o motivo ou objetivo..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">Ticket OTRS (Opcional)</label>
                      <Input
                        value={form.otrs_ticket || ''}
                        onChange={e => setForm({ ...form, otrs_ticket: e.target.value })}
                        placeholder="Ex: 202310150001"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">ID do Atendimento (Opcional)</label>
                      <Input
                        type="number"
                        value={form.attendance_id || ''}
                        onChange={e => setForm({ ...form, attendance_id: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Ex: 1234"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Projeto Operacional (Opcional)</label>
                    <ProjectSelect
                      value={form.project_id || null}
                      onChange={projectId => setForm({ ...form, project_id: projectId || null })}
                      disabled={isSubmitting}
                      lockedContextName={initialProjectName}
                    />
                  </div>

                  {/* Template Selection */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" /> Checklist
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">Modelo de checklist (opcional)</label>
                      <select
                        value={form.checklist_template_id || ''}
                        onChange={e => setForm({ ...form, checklist_template_id: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs"
                      >
                        <option value="">Nenhum template...</option>
                        {checklistTemplates.filter(t => t.is_active).map(tpl => (
                          <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                        ))}
                      </select>
                    </div>

                    {!form.checklist_template_id && (
                      <div className="space-y-2 mt-4">
                        <label className="text-xs font-semibold">Itens Manuais</label>
                        <div className="flex gap-2">
                          <Input
                            value={newChecklistItemInput}
                            onChange={(e) => setNewChecklistItemInput(e.target.value)}
                            placeholder="Novo item..."
                            className="h-8 text-xs"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                          />
                          <Button variant="secondary" size="sm" onClick={handleAddChecklistItem} className="h-8">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {form.checklist_items && form.checklist_items.length > 0 && (
                          <ul className="space-y-2 mt-2">
                            {form.checklist_items.map((item, idx) => (
                              <li key={idx} className="flex items-center justify-between bg-muted/30 p-2 rounded text-xs">
                                <span>{item}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveChecklistItem(idx)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-6 mt-6 border-t">
              {step === 1 ? (
                <div></div>
              ) : (
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              )}
              
              <div className="flex gap-3">
                {step === 1 && (
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Detalhes (Opcional)
                  </Button>
                )}
                <Button onClick={handleSubmit} disabled={isSubmitting || !form.title || !form.equipment_id}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
};
