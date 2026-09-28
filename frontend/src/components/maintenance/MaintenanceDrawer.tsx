import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/Toast';
import {
  X,
  Edit2,
  CheckCircle2,
  HardDrive,
  FileText,
  MapPin,
  Save,
  Wrench,
  Play,
  Check
} from 'lucide-react';
import { maintenanceService } from '@/services/maintenanceService';
import type { MaintenanceRecord, MaintenanceUpdatePayload } from '@/types/maintenance';
import type { EquipmentItem } from '@/types/infrastructure';
import { AttachmentManager } from '@/components/attachments/AttachmentManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  maintenance: MaintenanceRecord | null;
  equipmentList: EquipmentItem[];
  onSuccess: () => void;
  onChecklistItemToggle: (checklistId: number, itemId: number, currentVal: boolean) => void;
}

export const MaintenanceDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  maintenance,
  equipmentList,
  onSuccess,
  onChecklistItemToggle,
}) => {
  const { success, error: toastError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<MaintenanceUpdatePayload>({});

  useEffect(() => {
    if (isOpen && maintenance) {
      setIsEditing(false); // reset to view mode
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
        attendance_id: maintenance.attendance_id || null,
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
      await maintenanceService.updateMaintenance(maintenance.id, formData);
      success('Sucesso', 'Manutenção atualizada com sucesso');
      onSuccess();
      setIsEditing(false);
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

  const handleStatusChange = async (newStatus: string) => {
    if (!maintenance) return;
    setIsSaving(true);
    try {
      await maintenanceService.updateMaintenance(maintenance.id, { status: newStatus });
      success('Status Atualizado', `A manutenção foi marcada como ${newStatus}`);
      onSuccess();
    } catch (err) {
      toastError('Erro', 'Falha ao atualizar status');
    } finally {
      setIsSaving(false);
    }
  };

  if (!maintenance) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada': return <Badge variant="info">Agendada</Badge>;
      case 'em_andamento': return <Badge variant="warning">Em Andamento</Badge>;
      case 'concluida': return <Badge variant="success">Concluída</Badge>;
      case 'cancelada': return <Badge variant="destructive">Cancelada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'preventiva': return 'Preventiva';
      case 'corretiva': return 'Corretiva';
      case 'substituicao': return 'Substituição';
      case 'atualizacao': return 'Atualização';
      case 'configuracao': return 'Configuração';
      case 'instalacao': return 'Instalação';
      default: return 'Outro';
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerContent side="right" size="lg" className="h-full rounded-none">
          <DrawerHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
            <div>
              <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
                {isEditing ? 'Editar Manutenção' : maintenance.title}
                {!isEditing && getStatusBadge(maintenance.status)}
              </DrawerTitle>
              <DrawerDescription>
                {isEditing ? `Alterando dados do ID #${maintenance.id}` : `Detalhes da manutenção #${maintenance.id}`}
              </DrawerDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!isEditing ? (
                <>
                  {maintenance.status === 'agendada' && (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('em_andamento')} disabled={isSaving} className="text-warning border-warning/50 hover:bg-warning/10">
                      <Play className="h-4 w-4 mr-1.5" />
                      Iniciar
                    </Button>
                  )}
                  {maintenance.status === 'em_andamento' && (
                    <Button variant="default" size="sm" onClick={() => handleStatusChange('concluida')} disabled={isSaving} className="bg-success hover:bg-success/90">
                      <Check className="h-4 w-4 mr-1.5" />
                      Concluir
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
            {isEditing ? (
              // EDIT MODE FORM
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">ID do Atendimento</label>
                    <Input
                      type="number"
                      value={formData.attendance_id || ''}
                      onChange={e => setFormData({ ...formData, attendance_id: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Ex: 1234"
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

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancelar</Button>
                  <Button onClick={handleSave} disabled={isSaving || !formData.title || !formData.equipment_id}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              // VIEW MODE
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* 1. Visão Geral */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center">
                    <FileText className="mr-2 h-4 w-4" /> Visão Geral
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Descrição</p>
                      <p className="text-sm font-medium">{maintenance.description || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="text-sm font-medium">{getTypeLabel(maintenance.maintenance_type)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Agendado Para</p>
                      <p className="text-sm font-medium">
                        {maintenance.scheduled_date ? new Date(maintenance.scheduled_date).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Realizado Em</p>
                      <p className="text-sm font-medium">
                        {maintenance.performed_date ? new Date(maintenance.performed_date).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* 2. Equipamento e Local Histórico */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center">
                    <HardDrive className="mr-2 h-4 w-4" /> Equipamento & Localização
                  </h3>
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Equipamento</p>
                        <p className="text-sm font-medium">{maintenance.equipment?.hostname || maintenance.equipment?.model || 'Desconhecido'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Patrimônio</p>
                        <p className="text-sm font-medium">{maintenance.equipment?.patrimony || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          Localização Registrada (Snapshot)
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {maintenance.store?.name ? maintenance.store.name : 'Local não registrado'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Execução Técnica */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center">
                    <Wrench className="mr-2 h-4 w-4" /> Execução Técnica
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Diagnóstico</p>
                      <p className="text-sm font-medium">{maintenance.diagnosis || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Procedimento Realizado</p>
                      <p className="text-sm font-medium">{maintenance.procedure_performed || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Peças / Materiais Utilizados</p>
                      <p className="text-sm font-medium">{maintenance.parts_used || 'Nenhuma peça'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Resultado</p>
                      <p className="text-sm font-medium">{maintenance.result || '—'}</p>
                    </div>
                  </div>
                  
                  {maintenance.otrs_ticket && (
                    <div className="mt-4 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        Ticket OTRS Associado: {maintenance.otrs_ticket}
                      </p>
                    </div>
                  )}

                  {maintenance.attendance_id && (
                    <div className="mt-2 p-3 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        ID do Atendimento Vinculado: #{maintenance.attendance_id}
                      </p>
                    </div>
                  )}
                </section>

                {/* 4. Checklists */}
                {maintenance.checklists && maintenance.checklists.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Checklist ({maintenance.checklists[0].items.filter(i => i.is_completed).length}/{maintenance.checklists[0].items.length})
                    </h3>
                    <div className="space-y-2 border rounded-lg p-3">
                      {maintenance.checklists[0].items.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors">
                          <input
                            type="checkbox"
                            checked={item.is_completed}
                            onChange={() => onChecklistItemToggle(maintenance.checklists[0].id, item.id, item.is_completed)}
                            className="mt-1 rounded border-border"
                          />
                          <div>
                            <p className={`text-sm ${item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {item.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 5. Arquivos */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center">
                    <FileText className="mr-2 h-4 w-4" /> Arquivos e Anexos
                  </h3>
                  <div className="border rounded-lg p-4">
                    <AttachmentManager
                      entityType="maintenance"
                      entityId={maintenance.id}
                      readOnly={false}
                    />
                  </div>
                </section>
              </div>
            )}
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
};
