import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  BarChart3,
  BookOpen,
  Terminal,
  Headset,
  Server,
  Wrench,
  CheckSquare,
  Download,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { searchService } from '@/services/searchService';
import { reportsService } from '@/services/reportsService';
import { infrastructureService } from '@/services/infrastructureService';
import type { SearchResultItem, SearchEntityType } from '@/types/search';
import type { OperationalSummaryReport } from '@/types/reports';
import type { StoreItem } from '@/types/infrastructure';

interface SearchAndReportsPageProps {
  onSelectTab?: (tab: string) => void;
}

export const SearchAndReportsPage: React.FC<SearchAndReportsPageProps> = ({ onSelectTab }) => {
  const [activeView, setActiveView] = useState<'search' | 'reports'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<SearchEntityType | 'all'>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [stores, setStores] = useState<StoreItem[]>([]);

  // Reports state
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [reportData, setReportData] = useState<OperationalSummaryReport | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Load stores for filter
  useEffect(() => {
    infrastructureService.getStores('ativa').then(setStores).catch(() => {});
  }, []);

  // Debounced search
  const performSearch = useCallback(
    async (query: string, entityType: SearchEntityType | 'all', storeId?: number) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setSearchResults([]);
        setTotalResults(0);
        setHasSearched(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);
      try {
        const res = await searchService.globalSearch({
          q: trimmed,
          entity_type: entityType === 'all' ? undefined : entityType,
          store_id: storeId,
          limit: 30,
        });
        setSearchResults(res.results);
        setTotalResults(res.total_results);
      } catch (err) {
        console.error('Falha ao executar busca global:', err);
        setSearchResults([]);
        setTotalResults(0);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(searchQuery, selectedEntityType, selectedStoreId);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery, selectedEntityType, selectedStoreId, performSearch]);

  // Load reports
  const loadReports = useCallback(async (days: number) => {
    setIsLoadingReports(true);
    setReportsError(null);
    try {
      const data = await reportsService.getSummary(days);
      setReportData(data);
    } catch (err: any) {
      console.error('Falha ao carregar relatórios:', err);
      setReportsError(err.message || 'Falha ao carregar indicadores operacionais.');
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === 'reports') {
      loadReports(selectedDays);
    }
  }, [activeView, selectedDays, loadReports]);

  // CSV Export handler
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      await reportsService.downloadCsvExport(selectedDays);
    } catch (err) {
      console.error('Erro na exportação CSV:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const entityTypeFilters: { id: SearchEntityType | 'all'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all', label: 'Todos os Módulos', icon: Layers },
    { id: 'knowledge', label: 'Conhecimento', icon: BookOpen },
    { id: 'command', label: 'Comandos Rápidos', icon: Terminal },
    { id: 'attendance', label: 'Atendimentos', icon: Headset },
    { id: 'equipment', label: 'Equipamentos', icon: Server },
    { id: 'maintenance', label: 'Manutenções', icon: Wrench },
    { id: 'task', label: 'Tarefas / Checklists', icon: CheckSquare },
  ];

  const getEntityIcon = (type: SearchEntityType) => {
    switch (type) {
      case 'knowledge':
        return <BookOpen className="h-4 w-4 text-emerald-400" />;
      case 'command':
        return <Terminal className="h-4 w-4 text-purple-400" />;
      case 'attendance':
        return <Headset className="h-4 w-4 text-sky-400" />;
      case 'equipment':
        return <Server className="h-4 w-4 text-amber-400" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-orange-400" />;
      case 'task':
        return <CheckSquare className="h-4 w-4 text-indigo-400" />;
    }
  };

  const getEntityBadgeStyle = (type: SearchEntityType) => {
    switch (type) {
      case 'knowledge':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'command':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'attendance':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'equipment':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'maintenance':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'task':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header and View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            Pesquisa & Relatórios Operacionais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pesquisa unificada em toda a base técnica e indicadores consolidados de manutenção e atendimento.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/80 self-start md:self-auto">
          <Button
            variant={activeView === 'search' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('search')}
            className={`gap-2 rounded-lg cursor-pointer ${
              activeView === 'search' ? 'shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Pesquisa Unificada</span>
          </Button>
          <Button
            variant={activeView === 'reports' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('reports')}
            className={`gap-2 rounded-lg cursor-pointer ${
              activeView === 'reports' ? 'shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Relatórios & Métricas</span>
          </Button>
        </div>
      </div>

      {/* VIEW 1: PESQUISA UNIFICADA */}
      {activeView === 'search' && (
        <div className="space-y-6">
          {/* Search Box Card */}
          <Card className="border-border/80 bg-card/80 backdrop-blur-sm shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Pesquise por procedimento, IP, hostname, comando, chamado OTRS ou tarefa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-10 py-6 text-base rounded-xl border-border/80 bg-background/60 focus-visible:ring-primary/40"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                    title="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Pills and Store Select */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {entityTypeFilters.map((f) => {
                    const Icon = f.icon;
                    const isSelected = selectedEntityType === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedEntityType(f.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-muted/40 text-muted-foreground border-border/70 hover:bg-muted/80 hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{f.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Store Filter */}
                {stores.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      value={selectedStoreId || ''}
                      onChange={(e) => setSelectedStoreId(e.target.value ? Number(e.target.value) : undefined)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-border/70 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="">Todas as Unidades/Lojas</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Search Content States */}
          {isSearching ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border/60 bg-card/40 p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : hasSearched ? (
            searchResults.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    Encontrados <strong className="text-foreground">{totalResults}</strong> resultado(s) para "
                    <strong className="text-foreground">{searchQuery}</strong>"
                  </span>
                  <span>Exibindo os mais relevantes</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {searchResults.map((item) => (
                    <Card
                      key={`${item.entity_type}-${item.id}`}
                      className="border-border/70 hover:border-primary/40 bg-card/60 hover:bg-card/90 transition-all duration-200 group"
                    >
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-muted/60 border border-border/60 shrink-0 mt-0.5">
                            {getEntityIcon(item.entity_type)}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getEntityBadgeStyle(
                                  item.entity_type
                                )}`}
                              >
                                {item.entity_type}
                              </span>
                              {item.badge && (
                                <Badge variant="outline" className="text-[11px] font-mono">
                                  {item.badge}
                                </Badge>
                              )}
                              {item.created_at && (
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {item.title}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {item.snippet}
                            </p>
                          </div>
                        </div>

                        {onSelectTab && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectTab(item.url_tab)}
                            className="shrink-0 gap-1.5 text-xs text-primary group-hover:translate-x-0.5 transition-transform self-end sm:self-center cursor-pointer"
                          >
                            <span>Ir para Módulo</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="border-dashed border-border/80 bg-card/30 p-8 text-center">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Nenhum resultado encontrado</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Não encontramos correspondências para "<span className="text-foreground font-medium">{searchQuery}</span>".
                    Tente termos mais abrangentes ou limpe os filtros de módulo/unidade.
                  </p>
                </div>
              </Card>
            )
          ) : (
            /* Initial Helper State */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border/60 bg-card/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <Terminal className="h-4 w-4" />
                    <span>Comandos & Sintaxes</span>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed">
                  Localize comandos rápidos para switches, impressoras térmicas, rotas de rede e scripts de manutenção.
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                    <Headset className="h-4 w-4" />
                    <span>Histórico & OTRS</span>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed">
                  Encontre soluções técnicas anteriores buscando pelo protocolo OTRS, tipo de falha ou hostname do equipamento.
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <BookOpen className="h-4 w-4" />
                    <span>Base de Conhecimento</span>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed">
                  Acesse tutoriais, manuais e procedimentos operacionais padronizados (POPs) validados pela equipe técnica.
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: RELATÓRIOS & MÉTRICAS OPERACIONAIS */}
      {activeView === 'reports' && (
        <div className="space-y-6">
          {/* Controls Bar: Period selector & CSV Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-xl border border-border/80">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Período:</span>
              <div className="flex items-center gap-1">
                {[
                  { days: 7, label: '7 dias' },
                  { days: 30, label: '30 dias' },
                  { days: 90, label: '90 dias' },
                  { days: 365, label: '1 ano' },
                ].map((p) => (
                  <Button
                    key={p.days}
                    variant={selectedDays === p.days ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedDays(p.days)}
                    className="h-7 text-xs rounded-lg cursor-pointer"
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className="gap-2 text-xs border-primary/30 hover:border-primary text-foreground cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              <span>{isExportingCsv ? 'Exportando...' : 'Exportar Relatório CSV'}</span>
            </Button>
          </div>

          {reportsError ? (
            <Card className="border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
              {reportsError}
            </Card>
          ) : isLoadingReports || !reportData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-7 w-3/4" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Taxa de Resolução */}
                <Card className="border-border/80 bg-card/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Taxa de Resolução</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold text-foreground">
                      {reportData.attendance_resolution_rate}%
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {reportData.resolved_attendances} de {reportData.total_attendances} atendimentos resolvidos
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(reportData.attendance_resolution_rate, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Total de Atendimentos */}
                <Card className="border-border/80 bg-card/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Atendimentos no Período</span>
                      <Headset className="h-4 w-4 text-sky-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {reportData.total_attendances}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Registros internos vinculados a chamados OTRS
                    </p>
                  </CardContent>
                </Card>

                {/* 3. Manutenções Concluídas */}
                <Card className="border-border/80 bg-card/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Manutenções Concluídas</span>
                      <Wrench className="h-4 w-4 text-orange-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {reportData.completed_maintenances}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      De um total de {reportData.total_maintenances} ordens abertas
                    </p>
                  </CardContent>
                </Card>

                {/* 4. Custo Total de Manutenção */}
                <Card className="border-border/80 bg-card/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Custo de Manutenção</span>
                      <DollarSign className="h-4 w-4 text-amber-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(reportData.total_maintenance_cost)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Investimento em reparos e manutenções preventivas
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Section: Equipamentos com Reincidência de Falhas */}
              <Card className="border-border/80 bg-card/70">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold font-heading flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <span>Reincidência de Falhas no Parque de TI</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Equipamentos com maior número de incidentes e manutenções no período selecionado.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {reportData.recurrent_equipment.length} ativo(s)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportData.recurrent_equipment.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      Nenhuma recorrência crítica de falhas registrada no período de {selectedDays} dias.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground text-left">
                            <th className="pb-2.5 font-semibold">Equipamento / Hostname</th>
                            <th className="pb-2.5 font-semibold">Tipo</th>
                            <th className="pb-2.5 font-semibold">Unidade / Loja</th>
                            <th className="pb-2.5 font-semibold text-center">Atendimentos</th>
                            <th className="pb-2.5 font-semibold text-center">Manutenções</th>
                            <th className="pb-2.5 font-semibold text-center">Total Eventos</th>
                            <th className="pb-2.5 font-semibold text-right">Diagnóstico</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {reportData.recurrent_equipment.map((eq) => {
                            const isCritical = eq.total_events >= 3;
                            return (
                              <tr key={eq.equipment_id} className="hover:bg-muted/30 transition-colors">
                                <td className="py-2.5 font-semibold text-foreground">
                                  {eq.hostname}
                                  {eq.patrimony && (
                                    <span className="block text-[11px] text-muted-foreground font-mono">
                                      Pat: {eq.patrimony}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 text-muted-foreground uppercase">{eq.equipment_type}</td>
                                <td className="py-2.5 text-muted-foreground">{eq.store_name || 'Geral / Matriz'}</td>
                                <td className="py-2.5 text-center font-medium">{eq.incident_count}</td>
                                <td className="py-2.5 text-center font-medium">{eq.maintenance_count}</td>
                                <td className="py-2.5 text-center font-bold text-foreground">
                                  {eq.total_events}
                                </td>
                                <td className="py-2.5 text-right">
                                  {isCritical ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                      <AlertTriangle className="h-3 w-3" />
                                      Ativo Crítico
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                                      Acompanhamento
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section: Produtividade Técnica */}
              <Card className="border-border/80 bg-card/70">
                <CardHeader>
                  <CardTitle className="text-base font-semibold font-heading flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span>Produtividade da Equipe Técnica</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Volume de ações resolutivas executadas por técnico no período.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData.technicians_performance.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      Nenhum fechamento registrado no período de {selectedDays} dias.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground text-left">
                            <th className="pb-2.5 font-semibold">Técnico / Analista</th>
                            <th className="pb-2.5 font-semibold text-center">Atendimentos Resolvidos</th>
                            <th className="pb-2.5 font-semibold text-center">Manutenções Concluídas</th>
                            <th className="pb-2.5 font-semibold text-right">Total Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {reportData.technicians_performance.map((tech) => (
                            <tr key={tech.technician_id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 font-medium text-foreground">{tech.technician_name}</td>
                              <td className="py-2.5 text-center text-muted-foreground">
                                {tech.resolved_attendances}
                              </td>
                              <td className="py-2.5 text-center text-muted-foreground">
                                {tech.completed_maintenances}
                              </td>
                              <td className="py-2.5 text-right font-bold text-foreground">
                                {tech.total_actions}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
