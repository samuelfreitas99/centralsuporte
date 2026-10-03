import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Calendar,
  Headset,
  Wrench,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { reportsService } from '@/services/reportsService';
import type { OperationalSummaryReport } from '@/types/reports';

/** Indicadores operacionais (atendimentos, manutenções, reincidência e produtividade). */
export const ReportsPage: React.FC = () => {
  // Reports state
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [reportData, setReportData] = useState<OperationalSummaryReport | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

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
    loadReports(selectedDays);
  }, [selectedDays, loadReports]);

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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indicadores de atendimentos e manutenções, equipamentos com falhas recorrentes e produtividade da equipe.
        </p>
      </div>

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
    </div>
  );
};
