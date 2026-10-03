import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar, FilterSelect } from '@/components/ui/FilterBar';
import { statusOptions } from '@/lib/status';
import {
  Wrench,
  Plus,
  RefreshCw,
  FileText,
  Calendar as CalendarIcon,
  List as ListIcon,
  CheckCircle2,
  Clock,
  CalendarDays,
  AlertTriangle,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/Toast';
import { maintenanceService } from '@/services/maintenanceService';
import { infrastructureService } from '@/services/infrastructureService';
import { organizationService } from '@/services/organizationService';
import { checklistTemplateService } from '@/services/checklistTemplateService';

import type { MaintenanceRecord, MaintenanceMetrics } from '@/types/maintenance';
import type { EquipmentItem } from '@/types/infrastructure';
import type { ChecklistTemplate } from '@/types/checklistTemplate';
import type { CalendarEvent } from '@/types/tasks';

import { ChecklistTemplatesDialog } from '@/components/maintenance/ChecklistTemplatesDialog';
import { MaintenanceDrawer } from '@/components/maintenance/MaintenanceDrawer';
import { useDeepLinkId, clearDeepLinkId } from '@/hooks/useDeepLink';
import { Pagination } from '@/components/ui/Pagination';
import { MaintenanceCreateDrawer } from '@/components/maintenance/MaintenanceCreateDrawer';

const PAGE_SIZE = 30;

export const MaintenancePage: React.FC = () => {
  const { error: toastError } = useToast();

  // View toggles
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Data
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [metrics, setMetrics] = useState<MaintenanceMetrics | null>(null);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRecord | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Dados de apoio (equipamentos, modelos de checklist, eventos da agenda): uma vez só.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      infrastructureService.getEquipment().catch(() => []),
      checklistTemplateService.getTemplates().catch(() => []),
      organizationService.getCalendarEvents().catch(() => []),
    ]).then(([eqData, tplData, calData]) => {
      if (cancelled) return;
      setEquipmentList(eqData);
      setChecklistTemplates(tplData);
      setCalendarEvents(calData);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Lista (paginada) ou Agenda (agendadas a partir de 7 dias atrás, em ordem cronológica).
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const agendaFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [maintData, metricsData] = await Promise.all([
        maintenanceService.getMaintenances({
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          maintenance_type: selectedType !== 'all' ? selectedType : undefined,
          search: searchQuery || undefined,
          ...(viewMode === 'calendar'
            ? { scheduled_from: agendaFrom, limit: 100 }
            : { page, limit: PAGE_SIZE }),
        }),
        maintenanceService.getMetrics().catch(() => null),
      ]);
      setMaintenances(maintData.items);
      setTotalPages(maintData.total_pages);
      if (metricsData) setMetrics(metricsData);

      // Atualiza a manutenção aberta no drawer, se ela estiver na página carregada
      setSelectedMaintenance((prev) => {
        if (!prev) return prev;
        const updated = maintData.items.find((m) => m.id === prev.id);
        return updated ?? prev;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar manutenções';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedType, searchQuery, viewMode, page]);

  // Volta para a página 1 quando um filtro ou o modo de visualização muda.
  const filterKey = `${selectedStatus}|${selectedType}|${searchQuery}|${viewMode}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDetail = (maint: MaintenanceRecord) => {
    setSelectedMaintenance(maint);
    setIsDetailDrawerOpen(true);
  };

  // #maintenances?new=true&equipment_id=N: "Agendar manutenção" a partir da ficha do equipamento
  const [createPrefill, setCreatePrefill] = useState<{ key: number; equipmentIds: number[] }>({ key: 0, equipmentIds: [] });
  useEffect(() => {
    const check = () => {
      const [tab, query] = window.location.hash.replace('#', '').split('?');
      const params = new URLSearchParams(query || '');
      if (tab !== 'maintenances' || params.get('new') !== 'true') return;
      const equipmentId = Number(params.get('equipment_id'));
      setCreatePrefill((prev) => ({ key: prev.key + 1, equipmentIds: equipmentId ? [equipmentId] : [] }));
      setIsCreateDrawerOpen(true);
      window.history.replaceState(null, '', '#maintenances');
    };
    check();
    window.addEventListener('popstate', check);
    window.addEventListener('hashchange', check);
    return () => {
      window.removeEventListener('popstate', check);
      window.removeEventListener('hashchange', check);
    };
  }, []);

  // #maintenances?id=N (busca global, ficha do equipamento, Início)
  useDeepLinkId('maintenances', async (id) => {
    try {
      handleOpenDetail(await maintenanceService.getMaintenance(id));
    } catch {
      clearDeepLinkId();
    }
  });

  const getStatusBadge = (status: string) => <StatusBadge domain="maintenance" status={status} />;

  const handleChecklistItemToggle = async (checklistId: number, itemId: number, currentVal: boolean) => {
    try {
      await maintenanceService.toggleChecklistItem(checklistId, itemId, !currentVal);
      loadData(); // Re-fetch to get updated state
    } catch {
      toastError('Erro ao atualizar', 'Não foi possível marcar o item.');
    }
  };

  // Group events and maintenances for calendar view
  const getCalendarItems = () => {
    const items: { id: string; date: Date; type: string; title: string; subtitle: string; original: any }[] = [];
    
    maintenances.forEach(m => {
      if (m.scheduled_date) {
        items.push({
          id: `m-${m.id}`,
          date: new Date(m.scheduled_date),
          type: 'manutencao',
          title: m.title,
          subtitle: `${m.equipment?.hostname || 'Eq'} - ${m.status}`,
          original: m
        });
      }
    });

    calendarEvents.forEach(e => {
      items.push({
        id: `e-${e.id}`,
        date: new Date(e.start_time),
        type: 'evento',
        title: e.title,
        subtitle: e.event_type,
        original: e
      });
    });

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader icon={Wrench} title="Manutenções" description="Preventivas e corretivas, com checklists e equipamentos envolvidos.">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsTemplatesModalOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button variant="default" size="sm" onClick={() => setIsCreateDrawerOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Manutenção
          </Button>
        </div>
      </PageHeader>

      {/* METRICS (Compact Row) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Total</p>
            <p className="text-xl font-bold">{metrics?.total ?? maintenances.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-2 rounded-lg bg-info/10 text-info">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Agendadas</p>
            <p className="text-xl font-bold">{metrics?.agendadas ?? maintenances.filter(m => m.status === 'agendada').length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-2 rounded-lg bg-warning/10 text-warning">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Em Andamento</p>
            <p className="text-xl font-bold">{metrics?.em_andamento ?? maintenances.filter(m => m.status === 'em_andamento').length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-2 rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Concluídas</p>
            <p className="text-xl font-bold">{metrics?.concluidas ?? maintenances.filter(m => m.status === 'concluida').length}</p>
          </div>
        </div>
      </div>

      <FilterBar search={searchQuery} onSearch={setSearchQuery} placeholder="Buscar por título, equipamento, chamado OTRS...">
        <FilterSelect label="Status" value={selectedStatus} onChange={setSelectedStatus} options={statusOptions('maintenance')} />
        <FilterSelect
          label="Tipo"
          value={selectedType}
          onChange={setSelectedType}
          options={[
            { value: 'preventiva', label: 'Preventiva' },
            { value: 'corretiva', label: 'Corretiva' },
            { value: 'substituicao', label: 'Substituição' },
            { value: 'atualizacao', label: 'Atualização' },
          ]}
        />
        <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Visualização">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-7 text-xs px-3"
          >
            <ListIcon className="h-3.5 w-3.5 mr-1.5" /> Lista
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="h-7 text-xs px-3"
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" /> Agenda
          </Button>
        </div>
      </FilterBar>

      {/* CONTENT AREA */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(n => <Skeleton key={n} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : errorMessage ? (
        <div className="text-center py-12 px-4 rounded-xl border bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8 mx-auto mb-3" />
          <p className="font-semibold">{errorMessage}</p>
        </div>
      ) : (
        <>
          {viewMode === 'list' && (
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              {maintenances.length === 0 ? (
                <div className="text-center py-12 px-4 text-muted-foreground">
                  <Wrench className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold text-foreground">Você ainda não possui manutenções registradas.</p>
                  <p className="text-sm mt-1 mb-4">Utilize o botão acima para criar o primeiro agendamento.</p>
                  <Button size="sm" onClick={() => setIsCreateDrawerOpen(true)}>Nova Manutenção</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium">Manutenção</th>
                        <th className="px-4 py-3 font-medium">Equipamento / Loja</th>
                        <th className="px-4 py-3 font-medium">Data</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {maintenances.map(maint => (
                        <tr 
                          key={maint.id} 
                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => handleOpenDetail(maint)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{maint.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{maint.maintenance_type}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs">
                              <HardDrive className="h-3.5 w-3.5 text-primary" />
                              <span className="font-medium">
                                {maint.equipments && maint.equipments.length > 1
                                  ? `${maint.equipments[0].hostname || maint.equipments[0].model || 'Equipamento'} (+${maint.equipments.length - 1})`
                                  : (maint.equipments?.[0]?.hostname || maint.equipment?.hostname || maint.equipment?.patrimony || 'N/A')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 ml-5">{maint.store?.name || 'N/A'}</p>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {maint.scheduled_date ? formatDate(maint.scheduled_date) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(maint.status)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            {maint.otrs_ticket || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="p-3">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="bg-card border rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-lg mb-4 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-primary" />
                Agenda Operacional
              </h3>
              
              <div className="space-y-6">
                {getCalendarItems().length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento ou manutenção agendada.</p>
                ) : (
                  getCalendarItems().map(item => (
                    <div key={item.id} className="flex gap-4 p-3 rounded-lg border hover:border-primary/50 transition-colors">
                      <div className="flex flex-col items-center justify-center w-16 bg-muted rounded-md shrink-0">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {item.date.toLocaleDateString('pt-BR', { month: 'short' })}
                        </span>
                        <span className="text-xl font-bold text-foreground">
                          {item.date.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate text-foreground">{item.title}</h4>
                          <Badge variant={item.type === 'manutencao' ? 'info' : 'outline'} className="text-[10px] h-5">
                            {item.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {item.type === 'manutencao' && (
                        <div className="flex items-center">
                          <Button size="sm" variant="secondary" onClick={() => handleOpenDetail(item.original)}>
                            Detalhes
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* DRAWERS & MODALS */}
      <MaintenanceDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          clearDeepLinkId();
        }}
        maintenance={selectedMaintenance}
        equipmentList={equipmentList}
        onSuccess={loadData}
        onChecklistItemToggle={handleChecklistItemToggle}
      />

      <MaintenanceCreateDrawer
        key={createPrefill.key}
        initialEquipmentIds={createPrefill.equipmentIds}
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        equipmentList={equipmentList}
        checklistTemplates={checklistTemplates}
        onSuccess={loadData}
      />

      <ChecklistTemplatesDialog
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
      />
    </div>
  );
};
