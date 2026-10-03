import React, { useState, useMemo } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { equipmentToForm } from '../equipmentForm';
import { clearDeepLinkId } from '@/hooks/useDeepLink';
import { EquipmentActivity } from '@/components/infrastructure/EquipmentActivity';
import { motion, AnimatePresence } from 'motion/react';
import {
  Server,
  Laptop,
  Printer,
  Router,
  HardDrive,
  Cpu,
  Monitor,
  MapPin,
  Plus,
  MoreVertical,
  Network,
  Wrench,
  FileText,
  Activity,
  Headset,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast, type ToastType } from '@/components/ui/Toast';
import { infrastructureService } from '@/services/infrastructureService';
import { AttachmentManager } from '@/components/attachments/AttachmentManager';
import { useAuth } from '@/hooks/useAuth';
import type { EquipmentItem, EquipmentType, EquipmentStatus, EquipmentCreatePayload, StoreItem, DepartmentItem, TechnicalLocationItem } from '@/types/infrastructure';

export interface EquipmentTabProps {
  equipmentList: EquipmentItem[];
  setEquipmentList: React.Dispatch<React.SetStateAction<EquipmentItem[]>>;
  stores: StoreItem[];
  departments: DepartmentItem[];
  technicalLocations: TechnicalLocationItem[];
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
  departments,
  technicalLocations,
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
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const addToast = (opts: { title: string; description?: string; type?: ToastType }) => {
    showToast(opts.title, { message: opts.description, type: opts.type });
  };

  const [activeDrawerTab, setActiveDrawerTab] = useState('base');
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
        return <span className="text-emerald-500 font-medium">Ativo</span>;
      case 'em_manutencao':
        return <span className="text-amber-500 font-medium">Em Manutenção</span>;
      case 'reserva':
        return <span className="text-blue-500 font-medium">Reserva</span>;
      case 'descartado':
        return <span className="text-red-500 font-medium">Descartado</span>;
      default:
        return <span className="text-muted-foreground">{status}</span>;
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
      setEqForm(equipmentToForm(eq));
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
    setActiveDrawerTab('base');
    setIsEquipmentModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEquipment) {
        const updated = await infrastructureService.updateEquipment(editingEquipment.id, eqForm);
        // Preserve history if exists
        updated.history = editingEquipment.history;
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

  const confirm = useConfirm();

  const handleDeleteEquipment = async (eq: EquipmentItem) => {
    if (!(await confirm({ title: `Excluir ${eq.hostname || 'este equipamento'}?`, description: 'O histórico técnico é preservado.' }))) return;
    try {
      await infrastructureService.deleteEquipment(eq.id);
      setEquipmentList((prev) => prev.filter((item) => item.id !== eq.id));
      setIsEquipmentModalOpen(false);
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
    if (!editingEquipment || !newHistoryNote.trim()) return;
    setIsSubmittingHistory(true);
    try {
      const entry = await infrastructureService.addEquipmentHistory(editingEquipment.id, {
        event_type: 'observacao',
        description: newHistoryNote.trim(),
      });
      const updatedHistory = [entry, ...(editingEquipment.history || [])];
      const updatedEq = { ...editingEquipment, history: updatedHistory };
      setEditingEquipment(updatedEq);
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
        <Card className="border-border/60 bg-card/40 border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground border border-border/50">
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
            <Button onClick={() => handleOpenEquipmentModalLocal()} className="mt-2 flex items-center gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Cadastrar Equipamento</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col border border-border/40 rounded-xl overflow-hidden bg-card/50">
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-muted-foreground border-b border-border/40 bg-muted/20">
            <div className="col-span-4">EQUIPAMENTO</div>
            <div className="col-span-3">REDE / LOCALIZAÇÃO</div>
            <div className="col-span-2">STATUS</div>
            <div className="col-span-2">PATRIMÔNIO</div>
            <div className="col-span-1 text-right">AÇÕES</div>
          </div>
          
          <div className="flex flex-col">
            <AnimatePresence>
              {filteredEquipment.map((eq) => (
                <motion.div
                  key={eq.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border-b border-border/40 hover:bg-muted/30 transition-colors items-center group cursor-pointer"
                  onClick={() => handleOpenEquipmentModalLocal(eq)}
                >
                  <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background border border-border/50 shadow-sm shrink-0">
                      {getEquipmentIcon(eq.equipment_type)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {eq.hostname || 'Sem Hostname'}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {eq.brand} {eq.model}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-3 flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-foreground/80">
                      <Network className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{eq.ip_address || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate" title={[eq.store?.name, eq.department?.name, eq.technical_location?.name].filter(Boolean).join(' • ')}>
                        {[eq.store?.name, eq.department?.name, eq.technical_location?.name].filter(Boolean).join(' • ') || 'Sem Loja'}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 text-xs">
                    {getEquipmentStatusBadge(eq.status)}
                  </div>

                  <div className="col-span-1 md:col-span-2 flex items-center text-xs font-mono text-muted-foreground">
                    {eq.patrimony || '—'}
                  </div>

                  <div className="col-span-1 md:col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEquipmentModalLocal(eq);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* DRAWER: CREATE / EDIT EQUIPMENT */}
      <Drawer
        open={isEquipmentModalOpen}
        onOpenChange={(open) => {
          setIsEquipmentModalOpen(open);
          if (!open) clearDeepLinkId();
        }}
      >
        <DrawerContent size="lg" className="flex flex-col h-full max-h-[100dvh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-400" />
              <span>{editingEquipment ? eqForm.hostname || 'Detalhes do Equipamento' : 'Novo Equipamento'}</span>
            </DrawerTitle>
            <DrawerDescription>
              {editingEquipment ? `Patrimônio: ${eqForm.patrimony || 'N/A'}` : 'Cadastre um novo ativo no inventário.'}
            </DrawerDescription>
          </DrawerHeader>

          <Tabs value={activeDrawerTab} onValueChange={setActiveDrawerTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {editingEquipment && (
              <div className="px-5 sm:px-6 pt-2 shrink-0 border-b border-border/40">
                <TabsList className="w-full justify-start h-9 bg-transparent p-0">
                  <TabsTrigger value="base" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-2 pt-1 h-auto">
                    <Activity className="h-3.5 w-3.5 mr-1.5" /> Informações
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-2 pt-1 h-auto">
                    <Headset className="h-3.5 w-3.5 mr-1.5" /> Ocorrências
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-2 pt-1 h-auto">
                    <Wrench className="h-3.5 w-3.5 mr-1.5" /> Histórico
                  </TabsTrigger>
                  <TabsTrigger value="docs" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-2 pt-1 h-auto">
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Anexos
                  </TabsTrigger>
                </TabsList>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
              <TabsContent value="base" className="m-0 space-y-6">
                <form id="equipment-form" onSubmit={handleSaveEquipment} className="space-y-6">
                  {/* Info Base */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Informações Base</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Hostname *</label>
                        <Input
                          value={eqForm.hostname || ''}
                          onChange={(e) => setEqForm({ ...eqForm, hostname: e.target.value })}
                          placeholder="Ex: SRV-APP-01"
                          required
                          className="h-9 bg-background/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Tipo de Equipamento</label>
                        <select
                          value={eqForm.equipment_type}
                          onChange={(e) => setEqForm({ ...eqForm, equipment_type: e.target.value as EquipmentType })}
                          className="w-full h-9 rounded-lg border border-border/80 bg-background/50 px-3 text-sm text-foreground focus:outline-none cursor-pointer"
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
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Patrimônio</label>
                        <Input
                          value={eqForm.patrimony || ''}
                          onChange={(e) => setEqForm({ ...eqForm, patrimony: e.target.value })}
                          placeholder="Ex: PAT-089"
                          className="h-9 bg-background/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Status Operacional</label>
                        <select
                          value={eqForm.status}
                          onChange={(e) => setEqForm({ ...eqForm, status: e.target.value as EquipmentStatus })}
                          className="w-full h-9 rounded-lg border border-border/80 bg-background/50 px-3 text-sm text-foreground focus:outline-none cursor-pointer"
                        >
                          <option value="ativo">Ativo</option>
                          <option value="em_manutencao">Em Manutenção</option>
                          <option value="reserva">Reserva Técnica</option>
                          <option value="descartado">Descartado</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border/40 w-full" />

                  {/* Rede & Hardware */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Rede & Hardware</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Endereço IP</label>
                        <Input
                          value={eqForm.ip_address || ''}
                          onChange={(e) => setEqForm({ ...eqForm, ip_address: e.target.value })}
                          placeholder="Ex: 10.0.29.100"
                          className="h-9 bg-background/50 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">MAC Address</label>
                        <Input
                          value={eqForm.mac_address || ''}
                          onChange={(e) => setEqForm({ ...eqForm, mac_address: e.target.value })}
                          placeholder="Ex: AA:BB:CC:DD:EE:FF"
                          className="h-9 bg-background/50 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Fabricante</label>
                        <Input
                          value={eqForm.brand || ''}
                          onChange={(e) => setEqForm({ ...eqForm, brand: e.target.value })}
                          placeholder="Ex: Dell"
                          className="h-9 bg-background/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Modelo</label>
                        <Input
                          value={eqForm.model || ''}
                          onChange={(e) => setEqForm({ ...eqForm, model: e.target.value })}
                          placeholder="Ex: PowerEdge R740"
                          className="h-9 bg-background/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border/40 w-full" />

                  {/* Alocação */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Localização</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Unidade (Loja)</label>
                        <select
                          value={eqForm.store_id || ''}
                          onChange={(e) => setEqForm({ ...eqForm, store_id: e.target.value ? Number(e.target.value) : null, department_id: null, technical_location_id: null })}
                          className="w-full h-9 rounded-lg border border-border/80 bg-background/50 px-3 text-sm text-foreground focus:outline-none cursor-pointer"
                        >
                          <option value="">Não Alocado</option>
                          {stores.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Setor</label>
                        <select
                          value={eqForm.department_id || ''}
                          onChange={(e) => setEqForm({ ...eqForm, department_id: e.target.value ? Number(e.target.value) : null, technical_location_id: null })}
                          className="w-full h-9 rounded-lg border border-border/80 bg-background/50 px-3 text-sm text-foreground focus:outline-none cursor-pointer"
                          disabled={!eqForm.store_id}
                        >
                          <option value="">Não Alocado</option>
                          {departments
                            .filter(d => d.store_id === eqForm.store_id)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Local Técnico</label>
                        <select
                          value={eqForm.technical_location_id || ''}
                          onChange={(e) => setEqForm({ ...eqForm, technical_location_id: e.target.value ? Number(e.target.value) : null })}
                          className="w-full h-9 rounded-lg border border-border/80 bg-background/50 px-3 text-sm text-foreground focus:outline-none cursor-pointer"
                          disabled={!eqForm.store_id}
                        >
                          <option value="">Não Alocado</option>
                          {(technicalLocations || [])
                            .filter(loc => loc.store_id === eqForm.store_id && (!loc.department_id || !eqForm.department_id || loc.department_id === eqForm.department_id))
                            .map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name} {loc.location_type ? `(${loc.location_type})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">Usuário / Responsável</label>
                        <Input
                          value={eqForm.assigned_user || ''}
                          onChange={(e) => setEqForm({ ...eqForm, assigned_user: e.target.value })}
                          placeholder="Ex: Operação Caixa 01"
                          className="h-9 bg-background/50"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </TabsContent>

              {editingEquipment && (
                <>
                  <TabsContent value="activity" className="m-0">
                    <EquipmentActivity
                      equipmentId={editingEquipment.id}
                      canRegisterAttendance={hasPermission('attendance:write')}
                      canScheduleMaintenance={hasPermission('maintenance:write')}
                    />
                  </TabsContent>

                  <TabsContent value="history" className="m-0 flex flex-col h-full space-y-4">
                    <form onSubmit={handleAddHistoryNote} className="flex gap-2">
                      <Input
                        value={newHistoryNote}
                        onChange={(e) => setNewHistoryNote(e.target.value)}
                        placeholder="Registrar nova intervenção ou manutenção..."
                        className="text-sm bg-background/50 h-10"
                      />
                      <Button type="submit" disabled={isSubmittingHistory || !newHistoryNote.trim()} className="h-10 shrink-0 cursor-pointer">
                        Salvar
                      </Button>
                    </form>

                    <div className="flex-1 space-y-3 mt-4">
                      {editingEquipment.history && editingEquipment.history.length > 0 ? (
                        editingEquipment.history.map((h) => (
                          <div key={h.id} className="relative pl-6 pb-4 border-l border-border/40 last:border-0 last:pb-0">
                            <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-border border-2 border-card" />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <span className="font-semibold text-foreground uppercase tracking-wider">{h.event_type}</span>
                              <span className="font-mono">
                                • {new Date(h.created_at).toLocaleDateString('pt-BR')} {new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90">{h.description}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Nenhum histórico registrado para este ativo.
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="docs" className="m-0 flex flex-col h-full">
                    <AttachmentManager
                      entityType="equipment"
                      entityId={editingEquipment.id}
                      title="Anexos do Equipamento"
                      readOnly={!hasPermission('equipment:write')}
                    />
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>

          <DrawerFooter>
            {activeDrawerTab === 'base' && (
              <Button type="submit" form="equipment-form" className="w-full sm:w-auto cursor-pointer">
                {editingEquipment ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            )}
            {editingEquipment && (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto cursor-pointer"
                onClick={() => handleDeleteEquipment(editingEquipment)}
              >
                Excluir Equipamento
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};
