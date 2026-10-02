import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Search,
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
import { Input } from '@/components/ui/input';
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
import { MaintenanceCreateDrawer } from '@/components/maintenance/MaintenanceCreateDrawer';

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [maintData, metricsData, eqData, tplData, calData] = await Promise.all([
        maintenanceService.getMaintenances({
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          maintenance_type: selectedType !== 'all' ? selectedType : undefined,
          search: searchQuery || undefined,
        }),
        maintenanceService.getMetrics().catch(() => null),
        infrastructureService.getEquipment().catch(() => []),
        checklistTemplateService.getTemplates().catch(() => []),
        organizationService.getCalendarEvents().catch(() => [])
      ]);
      setMaintenances(maintData);
      if (metricsData) setMetrics(metricsData);
      setEquipmentList(eqData);
      setChecklistTemplates(tplData);
      setCalendarEvents(calData);

      // Refresh selected maintenance if it's open
      setSelectedMaintenance((prev) => {
        if (!prev) return prev;
        const updated = maintData.find((m) => m.id === prev.id);
        return updated ?? prev;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar manutenções';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedType, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDetail = (maint: MaintenanceRecord) => {
    setSelectedMaintenance(maint);
    setIsDetailDrawerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada': return <Badge variant="info">Agendada</Badge>;
      case 'em_andamento': return <Badge variant="warning">Em And. </Badge>;
      case 'concluida': return <Badge variant="success">Concluída</Badge>;
      case 'cancelada': return <Badge variant="destructive">Cancelada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

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
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            Centro de Manutenções
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Workspace operacional para gestão de preventivas, corretivas e intervenções.
          </p>
        </div>

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
      </div>

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

      {/* FILTERS & VIEW TOGGLE */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-3 rounded-xl border bg-card/50">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar manutenção..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">Status: Todos</option>
            <option value="agendada">Agendada</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">Tipo: Todos</option>
            <option value="preventiva">Preventiva</option>
            <option value="corretiva">Corretiva</option>
            <option value="substituicao">Substituição</option>
            <option value="atualizacao">Atualização</option>
          </select>
        </div>
        <div className="flex p-1 bg-muted rounded-lg">
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
      </div>

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
                            {maint.scheduled_date ? new Date(maint.scheduled_date).toLocaleDateString('pt-BR') : '—'}
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
        onClose={() => setIsDetailDrawerOpen(false)}
        maintenance={selectedMaintenance}
        equipmentList={equipmentList}
        onSuccess={loadData}
        onChecklistItemToggle={handleChecklistItemToggle}
      />

      <MaintenanceCreateDrawer
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
