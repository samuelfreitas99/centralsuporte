import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Play,
  Check,
  XCircle,
  FileText,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/Toast';
import { maintenanceService } from '@/services/maintenanceService';
import { infrastructureService } from '@/services/infrastructureService';
import type {
  MaintenanceRecord,
  MaintenanceCreatePayload,
  MaintenanceStatusPayload,
  MaintenanceMetrics,
} from '@/types/maintenance';
import type { EquipmentItem } from '@/types/infrastructure';

export const MaintenancePage: React.FC = () => {
  const { success, error: toastError } = useToast();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Data states
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [metrics, setMetrics] = useState<MaintenanceMetrics | null>(null);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Expanded checklist map
  const [expandedChecklists, setExpandedChecklists] = useState<Record<number, boolean>>({});

  // Dialog state: Create Maintenance
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<MaintenanceCreatePayload>({
    title: '',
    equipment_id: 0,
    store_id: null,
    maintenance_type: 'preventiva',
    priority: 'media',
    status: 'agendada',
    scheduled_date: '',
    description: '',
    checklist_title: 'Checklist Preventiva',
    checklist_items: [
      'Limpeza física dos componentes e coolers',
      'Inspeção dos cabos de força e conexões de rede',
      'Verificação e teste das portas periféricas',
      'Validação de temperatura e funcionamento operacional',
    ],
  });
  const [newChecklistItemInput, setNewChecklistItemInput] = useState('');

  // Dialog state: Complete / Resolve Maintenance
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingMaintenance, setCompletingMaintenance] = useState<MaintenanceRecord | null>(null);
  const [completeForm, setCompleteForm] = useState<{
    result: string;
    procedure_performed: string;
    cost?: number | null;
  }>({
    result: 'sucesso',
    procedure_performed: '',
    cost: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [maintData, metricsData, eqData] = await Promise.all([
        maintenanceService.getMaintenances({
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          maintenance_type: selectedType !== 'all' ? selectedType : undefined,
          priority: selectedPriority !== 'all' ? selectedPriority : undefined,
          search: searchQuery || undefined,
        }),
        maintenanceService.getMetrics().catch(() => null),
        infrastructureService.getEquipment().catch(() => []),
      ]);
      setMaintenances(maintData);
      if (metricsData) setMetrics(metricsData);
      setEquipmentList(eqData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar manutenções';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedType, selectedPriority, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle checklist expansion
  const toggleChecklistExpansion = (maintId: number) => {
    setExpandedChecklists((prev) => ({
      ...prev,
      [maintId]: !prev[maintId],
    }));
  };

  // Toggle checklist item completion
  const handleToggleChecklistItem = async (checklistId: number, itemId: number, currentVal: boolean) => {
    try {
      await maintenanceService.toggleChecklistItem(checklistId, itemId, !currentVal);
      // Update locally
      setMaintenances((prev) =>
        prev.map((m) => ({
          ...m,
          checklists: m.checklists.map((c) =>
            c.id === checklistId
              ? {
                  ...c,
                  items: c.items.map((it) =>
                    it.id === itemId ? { ...it, is_completed: !currentVal } : it
                  ),
                }
              : c
          ),
        }))
      );
    } catch {
      toastError('Erro ao atualizar item', 'Não foi possível marcar o item do checklist.');
    }
  };

  // Start maintenance
  const handleStartMaintenance = async (maint: MaintenanceRecord) => {
    try {
      const updated = await maintenanceService.updateStatus(maint.id, {
        status: 'em_andamento',
      });
      setMaintenances((prev) => prev.map((m) => (m.id === maint.id ? updated : m)));
      success('Manutenção Iniciada', `A manutenção "${maint.title}" agora está em andamento.`);
      loadData();
    } catch {
      toastError('Erro ao iniciar', 'Não foi possível iniciar a manutenção.');
    }
  };

  // Open Complete Modal
  const openCompleteModal = (maint: MaintenanceRecord) => {
    setCompletingMaintenance(maint);
    setCompleteForm({
      result: 'sucesso',
      procedure_performed: maint.procedure_performed || '',
      cost: maint.cost || null,
    });
    setIsCompleteModalOpen(true);
  };

  // Submit Complete Maintenance
  const handleCompleteMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingMaintenance) return;
    setIsSubmitting(true);
    try {
      const payload: MaintenanceStatusPayload = {
        status: 'concluida',
        result: completeForm.result,
        procedure_performed: completeForm.procedure_performed,
      };
      const updated = await maintenanceService.updateStatus(completingMaintenance.id, payload);
      setMaintenances((prev) => prev.map((m) => (m.id === completingMaintenance.id ? updated : m)));
      setIsCompleteModalOpen(false);
      success('Manutenção Concluída', `Registro finalizado com resultado: ${completeForm.result}.`);
      loadData();
    } catch {
      toastError('Erro ao concluir', 'Não foi possível registrar a conclusão da manutenção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Equipment selection in create form to auto-fill store
  const handleEquipmentChange = (eqId: number) => {
    const selected = equipmentList.find((e) => e.id === eqId);
    setCreateForm({
      ...createForm,
      equipment_id: eqId,
      store_id: selected?.store_id || null,
    });
  };

  // Add checklist item to form
  const handleAddFormChecklistItem = () => {
    if (!newChecklistItemInput.trim()) return;
    setCreateForm({
      ...createForm,
      checklist_items: [...(createForm.checklist_items || []), newChecklistItemInput.trim()],
    });
    setNewChecklistItemInput('');
  };

  // Remove checklist item from form
  const handleRemoveFormChecklistItem = (index: number) => {
    setCreateForm({
      ...createForm,
      checklist_items: (createForm.checklist_items || []).filter((_, idx) => idx !== index),
    });
  };

  // Submit Create Maintenance
  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.equipment_id) {
      toastError('Equipamento Obrigatório', 'Selecione um equipamento para vincular a manutenção.');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await maintenanceService.createMaintenance(createForm);
      setMaintenances([created, ...maintenances]);
      setIsCreateModalOpen(false);
      success('Manutenção Registrada', `Manutenção "${created.title}" agendada com sucesso.`);
      loadData();
    } catch {
      toastError('Erro ao agendar', 'Não foi possível agendar o registro de manutenção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Maintenance
  const handleDeleteMaintenance = async (id: number) => {
    if (!confirm('Deseja realmente excluir este registro de manutenção?')) return;
    try {
      await maintenanceService.deleteMaintenance(id);
      setMaintenances((prev) => prev.filter((m) => m.id !== id));
      success('Manutenção Excluída', 'Registro removido com sucesso.');
      loadData();
    } catch {
      toastError('Erro ao excluir', 'Não foi possível excluir a manutenção.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Badge variant="info">Agendada</Badge>;
      case 'em_andamento':
        return <Badge variant="warning">Em Andamento</Badge>;
      case 'concluida':
        return <Badge variant="success">Concluída</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'alta':
        return <Badge variant="warning">Alta</Badge>;
      case 'media':
        return <Badge variant="secondary">Média</Badge>;
      case 'baixa':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'preventiva':
        return 'Preventiva';
      case 'corretiva':
        return 'Corretiva';
      case 'substituicao':
        return 'Substituição';
      case 'atualizacao':
        return 'Atualização';
      case 'configuracao':
        return 'Configuração';
      case 'instalacao':
        return 'Instalação';
      default:
        return 'Outro';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumbs & Action Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Manutenções & Planos Preventivos
            </h1>
            <Badge variant="outline" className="text-xs font-semibold">
              Fase 9
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de rotinas preventivas, corretivas, checklists técnicos e histórico de intervenções no parque de TI.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Manutenção</span>
          </Button>
        </div>
      </div>

      {/* 2. Tactical Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border/70 bg-card/70 backdrop-blur-md">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Registrado
              </p>
              <div className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
                {metrics?.total ?? maintenances.length}
              </div>
              <p className="text-xs text-muted-foreground">Rotinas cadastradas</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Wrench className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 backdrop-blur-md">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Agendadas
              </p>
              <div className="text-2xl sm:text-3xl font-heading font-bold text-info">
                {metrics?.agendadas ?? maintenances.filter((m) => m.status === 'agendada').length}
              </div>
              <p className="text-xs text-muted-foreground">Próximas intervenções</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-info/20 bg-info/10 text-info">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 backdrop-blur-md">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Em Execução
              </p>
              <div className="text-2xl sm:text-3xl font-heading font-bold text-warning">
                {metrics?.em_andamento ?? maintenances.filter((m) => m.status === 'em_andamento').length}
              </div>
              <p className="text-xs text-muted-foreground">Técnico atuando agora</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-warning/20 bg-warning/10 text-warning">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 backdrop-blur-md">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Concluídas
              </p>
              <div className="text-2xl sm:text-3xl font-heading font-bold text-success">
                {metrics?.concluidas ?? maintenances.filter((m) => m.status === 'concluida').length}
              </div>
              <p className="text-xs text-muted-foreground">Procedimentos finalizados</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-success/20 bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, equipamento, diagnóstico ou procedimento..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="all">Todos os Tipos</option>
            <option value="preventiva">Preventiva</option>
            <option value="corretiva">Corretiva</option>
            <option value="substituicao">Substituição</option>
            <option value="atualizacao">Atualização</option>
            <option value="configuracao">Configuração</option>
            <option value="instalacao">Instalação</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="agendada">Agendada</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>

          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
      </div>

      {/* 4. Content Area: 4 States */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
          <h3 className="text-base font-semibold text-foreground">Falha ao carregar manutenções</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">{errorMessage}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="mt-4 gap-1.5 cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Tentar novamente</span>
          </Button>
        </div>
      ) : maintenances.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground mb-4">
            <Wrench className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-foreground font-heading">
            Nenhuma manutenção encontrada
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-md">
            Não há registros de manutenção preventiva ou corretiva cadastrados com os filtros atuais.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Agendar Primeira Manutenção</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {maintenances.map((maint) => {
            const hasChecklist = maint.checklists && maint.checklists.length > 0;
            const primaryChecklist = hasChecklist ? maint.checklists[0] : null;
            const completedCount = primaryChecklist?.items.filter((i) => i.is_completed).length || 0;
            const totalCount = primaryChecklist?.items.length || 0;
            const isExpanded = !!expandedChecklists[maint.id];

            return (
              <Card
                key={maint.id}
                className="overflow-hidden border-border/70 bg-card/75 backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top line: Status, Priority, Type badges and actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(maint.status)}
                      {getPriorityBadge(maint.priority)}
                      <Badge variant="outline" className="text-xs font-normal">
                        Tipo: {getTypeLabel(maint.maintenance_type)}
                      </Badge>
                      {maint.result && (
                        <Badge
                          variant={maint.result === 'sucesso' ? 'success' : 'warning'}
                          className="text-xs"
                        >
                          Resultado: {maint.result.toUpperCase()}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {maint.status === 'agendada' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartMaintenance(maint)}
                          className="h-7 px-2.5 text-xs text-warning hover:border-warning/50 hover:bg-warning/10 gap-1.5 cursor-pointer"
                        >
                          <Play className="h-3 w-3" />
                          <span>Iniciar</span>
                        </Button>
                      )}

                      {maint.status === 'em_andamento' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openCompleteModal(maint)}
                          className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer bg-success hover:bg-success/90 text-white"
                        >
                          <Check className="h-3 w-3" />
                          <span>Concluir</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMaintenance(maint.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </div>
                  </div>

                  {/* Title and Equipment Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <h3 className="text-base font-semibold text-foreground font-heading">
                        {maint.title}
                      </h3>
                      {maint.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {maint.description}
                        </p>
                      )}

                      {/* Equipment tag */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                        {maint.equipment && (
                          <div className="flex items-center gap-1.5 font-medium text-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                            <HardDrive className="h-3.5 w-3.5 text-primary" />
                            <span>
                              {maint.equipment.hostname || maint.equipment.model || 'Equipamento'}
                              {maint.equipment.patrimony ? ` (${maint.equipment.patrimony})` : ''}
                            </span>
                          </div>
                        )}

                        {maint.store && (
                          <span>Loja: {maint.store.name}</span>
                        )}

                        {maint.technician && (
                          <span>Técnico: {maint.technician.username}</span>
                        )}
                      </div>
                    </div>

                    {/* Dates and Cost */}
                    <div className="space-y-1 text-xs text-muted-foreground md:border-l md:border-border/40 md:pl-4">
                      {maint.scheduled_date && (
                        <div className="flex items-center justify-between">
                          <span>Agendada:</span>
                          <span className="font-mono text-foreground">
                            {new Date(maint.scheduled_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                      {maint.performed_date && (
                        <div className="flex items-center justify-between">
                          <span>Realizada:</span>
                          <span className="font-mono text-foreground">
                            {new Date(maint.performed_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                      {maint.cost !== null && maint.cost !== undefined && (
                        <div className="flex items-center justify-between pt-1">
                          <span>Custo de Peças:</span>
                          <span className="font-mono font-medium text-foreground">
                            R$ {Number(maint.cost).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Performed procedure summary if completed */}
                  {maint.procedure_performed && (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span>Procedimento Realizado:</span>
                      </span>
                      <p className="text-muted-foreground leading-relaxed pl-5">
                        {maint.procedure_performed}
                      </p>
                    </div>
                  )}

                  {/* Checklist Section */}
                  {primaryChecklist && (
                    <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold text-foreground">
                            {primaryChecklist.title}
                          </span>
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {completedCount}/{totalCount} concluídos
                          </Badge>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleChecklistExpansion(maint.id)}
                          className="h-6 px-2 text-xs text-muted-foreground flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Recolher' : 'Expandir Checklist'}</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                        />
                      </div>

                      {/* Expanded items */}
                      {isExpanded && (
                        <div className="pt-2 space-y-1.5 border-t border-border/40">
                          {primaryChecklist.items.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleToggleChecklistItem(primaryChecklist.id, item.id, item.is_completed)}
                              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer text-xs"
                            >
                              {item.is_completed ? (
                                <CheckSquare className="h-4 w-4 text-success shrink-0" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span className={item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}>
                                {item.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. MODAL: AGENDAR / CRIAR NOVA MANUTENÇÃO */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleCreateMaintenance} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Wrench className="h-5 w-5 text-primary" />
                <span>Agendar Nova Manutenção</span>
              </DialogTitle>
              <DialogDescription>
                Registre uma rotina de manutenção preventiva ou intervenção corretiva para um equipamento do parque de TI.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
              {/* Seção 1: Identificação */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Dados da Manutenção
                </p>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Título da Manutenção *
                  </label>
                  <Input
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="Ex: Revisão Trimestral dos Coolers e Cabos PDV 01"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Tipo de Manutenção
                    </label>
                    <select
                      value={createForm.maintenance_type}
                      onChange={(e) => setCreateForm({ ...createForm, maintenance_type: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="preventiva">Preventiva</option>
                      <option value="corretiva">Corretiva</option>
                      <option value="substituicao">Substituição</option>
                      <option value="atualizacao">Atualização</option>
                      <option value="configuracao">Configuração</option>
                      <option value="instalacao">Instalação</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Prioridade
                    </label>
                    <select
                      value={createForm.priority}
                      onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Data Agendada
                    </label>
                    <Input
                      type="date"
                      value={createForm.scheduled_date || ''}
                      onChange={(e) => setCreateForm({ ...createForm, scheduled_date: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Equipamento */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Equipamento Afetado & Localização
                </p>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Selecione o Equipamento *
                  </label>
                  <select
                    value={createForm.equipment_id}
                    onChange={(e) => handleEquipmentChange(Number(e.target.value))}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    required
                  >
                    <option value={0}>Selecione um equipamento cadastrado...</option>
                    {equipmentList.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.hostname || eq.model || 'Equipamento'} — Tipo: {eq.equipment_type.toUpperCase()}
                        {eq.patrimony ? ` (Patrimônio: ${eq.patrimony})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Descrição do Problema / Motivo da Manutenção
                  </label>
                  <textarea
                    value={createForm.description || ''}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    rows={2}
                    placeholder="Descreva os sintomas ou os motivos da verificação preventiva..."
                    className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed font-sans"
                  />
                </div>
              </div>

              {/* Seção 3: Checklist Inicial */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    3. Itens do Checklist Técnico
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {(createForm.checklist_items || []).length} itens
                  </span>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newChecklistItemInput}
                    onChange={(e) => setNewChecklistItemInput(e.target.value)}
                    placeholder="Adicionar item ao checklist (ex: Atualização de BIOS)..."
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFormChecklistItem();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddFormChecklistItem}
                    className="h-8 px-3 text-xs cursor-pointer"
                  >
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {(createForm.checklist_items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border/50 text-xs"
                    >
                      <span className="text-foreground">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFormChecklistItem(idx)}
                        className="text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? 'Agendando...' : 'Agendar Manutenção'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL: CONCLUIR MANUTENÇÃO */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCompleteMaintenance} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>Concluir Manutenção Técnica</span>
              </DialogTitle>
              <DialogDescription>
                Finalize os procedimentos realizados para alimentar o histórico do equipamento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-sm">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Resultado da Manutenção *
                </label>
                <select
                  value={completeForm.result}
                  onChange={(e) => setCompleteForm({ ...completeForm, result: e.target.value })}
                  className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  required
                >
                  <option value="sucesso">Sucesso (Equipamento 100% Operacional)</option>
                  <option value="parcial">Parcial (Necessita Acompanhamento)</option>
                  <option value="falha">Falha (Equipamento Permanece Inoperante / Troca Necessária)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Procedimento Realizado *
                </label>
                <textarea
                  value={completeForm.procedure_performed}
                  onChange={(e) => setCompleteForm({ ...completeForm, procedure_performed: e.target.value })}
                  rows={3}
                  placeholder="Descreva passo a passo o que foi feito (peças substituídas, testes efetuados)..."
                  className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed font-sans"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Custo Opcional de Peças / Insumos (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={completeForm.cost ?? ''}
                  onChange={(e) =>
                    setCompleteForm({
                      ...completeForm,
                      cost: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="0.00"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCompleteModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer bg-success hover:bg-success/90 text-white">
                {isSubmitting ? 'Finalizando...' : 'Concluir Manutenção'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
