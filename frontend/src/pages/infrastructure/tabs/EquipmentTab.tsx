import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Server,
  Laptop,
  Printer,
  Router,
  HardDrive,
  Cpu,
  Monitor,
  History,
  Trash2,
  Edit2,
  Clock,
  MapPin,
  Plus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast, type ToastType } from '@/components/ui/Toast';
import { infrastructureService } from '@/services/infrastructureService';
import { AttachmentManager } from '@/components/attachments/AttachmentManager';
import type { EquipmentItem, EquipmentType, EquipmentStatus, EquipmentCreatePayload, StoreItem } from '@/types/infrastructure';

export interface EquipmentTabProps {
  equipmentList: EquipmentItem[];
  setEquipmentList: React.Dispatch<React.SetStateAction<EquipmentItem[]>>;
  stores: StoreItem[];
  searchQuery: string;
  selectedStoreFilter: string;
  selectedTypeFilter: string;
  selectedStatusFilter: string;
  isEquipmentModalOpen: boolean;
  setIsEquipmentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingEquipment: EquipmentItem | null;
  setEditingEquipment: React.Dispatch<React.SetStateAction<EquipmentItem | null>>;
  eqForm: EquipmentCreatePayload;
  setEqForm: React.Dispatch<React.SetStateAction<EquipmentCreatePayload>>;
}

export const EquipmentTab: React.FC<EquipmentTabProps> = ({
  equipmentList,
  setEquipmentList,
  stores,
  searchQuery,
  selectedStoreFilter,
  selectedTypeFilter,
  selectedStatusFilter,
  isEquipmentModalOpen,
  setIsEquipmentModalOpen,
  editingEquipment,
  setEditingEquipment,
  eqForm,
  setEqForm,
}) => {
  const { showToast } = useToast();
  const addToast = (opts: { title: string; description?: string; type?: ToastType }) => {
    showToast(opts.title, { message: opts.description, type: opts.type });
  };

  const [viewingHistoryEquipment, setViewingHistoryEquipment] = useState<EquipmentItem | null>(null);
  const [newHistoryNote, setNewHistoryNote] = useState('');
  const [isSubmittingHistory, setIsSubmittingHistory] = useState(false);

  const getEquipmentIcon = (type: EquipmentType) => {
    switch (type) {
      case 'servidor':
        return <Server className="h-5 w-5 text-indigo-400" />;
      case 'notebook':
        return <Laptop className="h-5 w-5 text-cyan-400" />;
      case 'pdv':
        return <Cpu className="h-5 w-5 text-emerald-400" />;
      case 'impressora':
        return <Printer className="h-5 w-5 text-amber-400" />;
      case 'switch':
      case 'roteador':
      case 'access_point':
      case 'firewall':
        return <Router className="h-5 w-5 text-blue-400" />;
      case 'monitor':
        return <Monitor className="h-5 w-5 text-sky-400" />;
      default:
        return <HardDrive className="h-5 w-5 text-slate-400" />;
    }
  };

  const getEquipmentStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="success">Ativo</Badge>;
      case 'em_manutencao':
        return <Badge variant="warning">Em Manutenção</Badge>;
      case 'reserva':
        return <Badge variant="info">Reserva Técnica</Badge>;
      case 'descartado':
        return <Badge variant="destructive">Descartado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((eq) => {
      const matchesSearch =
        !searchQuery ||
        (eq.hostname && eq.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eq.patrimony && eq.patrimony.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eq.ip_address && eq.ip_address.includes(searchQuery)) ||
        (eq.model && eq.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eq.brand && eq.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eq.assigned_user && eq.assigned_user.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStore =
        selectedStoreFilter === 'all' || (eq.store_id && eq.store_id.toString() === selectedStoreFilter);

      const matchesType = selectedTypeFilter === 'all' || eq.equipment_type === selectedTypeFilter;

      const matchesStatus = selectedStatusFilter === 'all' || eq.status === selectedStatusFilter;

      return matchesSearch && matchesStore && matchesType && matchesStatus;
    });
  }, [equipmentList, searchQuery, selectedStoreFilter, selectedTypeFilter, selectedStatusFilter]);

  const handleOpenEquipmentModalLocal = (eq?: EquipmentItem) => {
    if (eq) {
      setEditingEquipment(eq);
      setEqForm({
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
    } else {
      setEditingEquipment(null);
      setEqForm({
        patrimony: '',
        hostname: '',
        equipment_type: 'computador',
        brand: '',
        model: '',
        serial_number: '',
        ip_address: '',
        mac_address: '',
        operating_system: '',
        store_id: stores[0]?.id || null,
        department_id: null,
        assigned_user: '',
        status: 'ativo',
        notes: '',
      });
    }
    setIsEquipmentModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEquipment) {
        const updated = await infrastructureService.updateEquipment(editingEquipment.id, eqForm);
        setEquipmentList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        addToast({
          title: 'Equipamento Atualizado',
          description: `Alterações em ${updated.hostname || 'equipamento'} salvas com sucesso.`,
          type: 'success',
        });
      } else {
        const created = await infrastructureService.createEquipment(eqForm);
        setEquipmentList((prev) => [created, ...prev]);
        addToast({
          title: 'Equipamento Cadastrado',
          description: `${created.hostname || 'Equipamento'} adicionado ao parque tecnológico.`,
          type: 'success',
        });
      }
      setIsEquipmentModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar equipamento.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleDeleteEquipment = async (eq: EquipmentItem) => {
    if (!window.confirm(`Tem certeza que deseja excluir ${eq.hostname || 'este equipamento'}?`)) return;
    try {
      await infrastructureService.deleteEquipment(eq.id);
      setEquipmentList((prev) => prev.filter((item) => item.id !== eq.id));
      addToast({
        title: 'Equipamento Excluído',
        description: 'Registro removido com sucesso.',
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir equipamento.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleAddHistoryNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingHistoryEquipment || !newHistoryNote.trim()) return;
    setIsSubmittingHistory(true);
    try {
      const entry = await infrastructureService.addEquipmentHistory(viewingHistoryEquipment.id, {
        event_type: 'observacao',
        description: newHistoryNote.trim(),
      });
      const updatedHistory = [entry, ...(viewingHistoryEquipment.history || [])];
      const updatedEq = { ...viewingHistoryEquipment, history: updatedHistory };
      setViewingHistoryEquipment(updatedEq);
      setEquipmentList((prev) => prev.map((item) => (item.id === updatedEq.id ? updatedEq : item)));
      setNewHistoryNote('');
      addToast({
        title: 'Histórico Registrado',
        description: 'Apontamento técnico adicionado ao equipamento.',
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar histórico.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    } finally {
      setIsSubmittingHistory(false);
    }
  };

  return (
    <>
      {filteredEquipment.length === 0 ? (
        <Card className="border-border/60 bg-card/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Server className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-semibold text-foreground font-heading">
                Nenhum equipamento encontrado
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedStoreFilter !== 'all' || selectedStatusFilter !== 'all'
                  ? 'Nenhum equipamento corresponde aos filtros aplicados.'
                  : 'Comece a cadastrar servidores, computadores, PDVs e switches para gerenciar o parque tecnológico.'}
              </p>
            </div>
            <Button onClick={() => handleOpenEquipmentModalLocal()} className="mt-2 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Cadastrar Primeiro Equipamento</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredEquipment.map((eq) => (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border/80 bg-card/75 hover:border-blue-500/40 hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 border border-border/80">
                          {getEquipmentIcon(eq.equipment_type)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-foreground font-heading leading-snug">
                            {eq.hostname || 'Sem Hostname'}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono">
                            Patr: {eq.patrimony || '—'}
                          </p>
                        </div>
                      </div>
                      {getEquipmentStatusBadge(eq.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs rounded-xl border border-border/60 bg-background/50 p-2.5">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">IP / Rede</span>
                        <span className="font-mono font-semibold text-blue-400">{eq.ip_address || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">MAC Address</span>
                        <span className="font-mono text-foreground text-[11px]">{eq.mac_address || '—'}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {eq.brand} {eq.model}
                        </span>
                        <span className="text-slate-300 font-medium">{eq.operating_system || ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-blue-400" />
                        <span>{eq.store?.name || 'Sem Loja'}</span>
                        {eq.department && <span className="text-foreground/80">({eq.department.name})</span>}
                      </div>
                      {eq.assigned_user && (
                        <span className="text-foreground font-medium bg-muted/40 px-2 py-0.5 rounded-md">
                          {eq.assigned_user}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-border/60 text-xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingHistoryEquipment(eq)}
                        className="h-8 text-xs flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 cursor-pointer"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>Histórico ({eq.history?.length || 0})</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEquipmentModalLocal(eq)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label="Editar equipamento"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEquipment(eq)}
                          className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                          aria-label="Excluir equipamento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* MODAL: CREATE / EDIT EQUIPMENT */}
      <Dialog open={isEquipmentModalOpen} onOpenChange={setIsEquipmentModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSaveEquipment} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Server className="h-5 w-5 text-blue-400" />
                <span>{editingEquipment ? 'Editar Equipamento' : 'Cadastrar Equipamento'}</span>
              </DialogTitle>
              <DialogDescription>
                Registro técnico detalhado no parque tecnológico para controle de inventário e atendimentos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Hostname / Nome do Dispositivo *</label>
                  <Input
                    value={eqForm.hostname || ''}
                    onChange={(e) => setEqForm({ ...eqForm, hostname: e.target.value })}
                    placeholder="Ex: SRV-APP-01 ou PDV-02"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Código de Patrimônio</label>
                  <Input
                    value={eqForm.patrimony || ''}
                    onChange={(e) => setEqForm({ ...eqForm, patrimony: e.target.value })}
                    placeholder="Ex: PAT-2026-089"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Tipo de Equipamento</label>
                  <select
                    value={eqForm.equipment_type}
                    onChange={(e) => setEqForm({ ...eqForm, equipment_type: e.target.value as EquipmentType })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="computador">Computador Desktop</option>
                    <option value="notebook">Notebook</option>
                    <option value="pdv">PDV Caixa</option>
                    <option value="servidor">Servidor</option>
                    <option value="impressora">Impressora</option>
                    <option value="switch">Switch</option>
                    <option value="access_point">Access Point</option>
                    <option value="roteador">Roteador</option>
                    <option value="firewall">Firewall</option>
                    <option value="monitor">Monitor</option>
                    <option value="nobreak">Nobreak/UPS</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Marca / Fabricante</label>
                  <Input
                    value={eqForm.brand || ''}
                    onChange={(e) => setEqForm({ ...eqForm, brand: e.target.value })}
                    placeholder="Ex: Dell, HP, Ubiquiti"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Modelo</label>
                  <Input
                    value={eqForm.model || ''}
                    onChange={(e) => setEqForm({ ...eqForm, model: e.target.value })}
                    placeholder="Ex: PowerEdge R740"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Endereço IP</label>
                  <Input
                    value={eqForm.ip_address || ''}
                    onChange={(e) => setEqForm({ ...eqForm, ip_address: e.target.value })}
                    placeholder="Ex: 10.0.29.100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">MAC Address</label>
                  <Input
                    value={eqForm.mac_address || ''}
                    onChange={(e) => setEqForm({ ...eqForm, mac_address: e.target.value })}
                    placeholder="Ex: AA:BB:CC:DD:EE:FF"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Status</label>
                  <select
                    value={eqForm.status}
                    onChange={(e) => setEqForm({ ...eqForm, status: e.target.value as EquipmentStatus })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="em_manutencao">Em Manutenção</option>
                    <option value="reserva">Reserva Técnica</option>
                    <option value="descartado">Descartado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Loja / Unidade</label>
                  <select
                    value={eqForm.store_id || ''}
                    onChange={(e) => setEqForm({ ...eqForm, store_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="">Nenhuma Loja</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Usuário / Responsável</label>
                  <Input
                    value={eqForm.assigned_user || ''}
                    onChange={(e) => setEqForm({ ...eqForm, assigned_user: e.target.value })}
                    placeholder="Ex: Gerente Operacional"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEquipmentModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="cursor-pointer">
                {editingEquipment ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL / DRAWER: EQUIPMENT TECHNICAL HISTORY */}
      <Dialog
        open={Boolean(viewingHistoryEquipment)}
        onOpenChange={(open) => !open && setViewingHistoryEquipment(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <History className="h-5 w-5 text-blue-400" />
              <span>Histórico Técnico: {viewingHistoryEquipment?.hostname}</span>
            </DialogTitle>
            <DialogDescription>
              Trilha de auditoria e apontamentos de manutenções, trocas de IP/MAC e eventos do equipamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {viewingHistoryEquipment?.history && viewingHistoryEquipment.history.length > 0 ? (
              viewingHistoryEquipment.history.map((h) => (
                <div key={h.id} className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-blue-400" />
                      <span>{h.event_type.toUpperCase()}</span>
                    </span>
                    <span className="text-[10px] font-mono">
                      {new Date(h.created_at).toLocaleDateString('pt-BR')} {new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{h.description}</p>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-muted-foreground">
                Nenhum evento registrado no histórico deste equipamento.
              </p>
            )}
          </div>

          <form onSubmit={handleAddHistoryNote} className="space-y-2 pt-2 border-t border-border/60">
            <label className="text-xs font-semibold text-foreground block">
              Adicionar Apontamento Técnico / Manutenção
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={newHistoryNote}
                onChange={(e) => setNewHistoryNote(e.target.value)}
                placeholder="Ex: Realizada troca de cabo de rede e reinstalação..."
                className="text-xs h-9 bg-background/60"
              />
              <Button type="submit" size="sm" disabled={isSubmittingHistory || !newHistoryNote.trim()} className="h-9 px-3 shrink-0 cursor-pointer">
                Salvar
              </Button>
            </div>
          </form>

          {viewingHistoryEquipment && (
            <div className="pt-3 border-t border-border/60">
              <AttachmentManager
                entityType="equipment"
                entityId={viewingHistoryEquipment.id}
                title="Manuais, NFs & Fotos do Equipamento"
                compact
              />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setViewingHistoryEquipment(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
