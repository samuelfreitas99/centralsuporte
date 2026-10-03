import React, { useEffect, useState } from 'react';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { reportsService } from '@/services/reportsService';
import type { OperationalSummaryReport } from '@/types/reports';

const PERIODS = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
];

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const StatTile: React.FC<{ label: string; value: React.ReactNode; detail?: string }> = ({ label, value, detail }) => (
  <div className="rounded-xl border border-border/60 bg-card p-4">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 font-heading text-3xl font-bold text-foreground tabular-nums">{value}</p>
    {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
  </div>
);

const Section: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <section className="rounded-xl border border-border/60 bg-card">
    <header className="border-b border-border/50 px-4 py-3">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </header>
    {children}
  </section>
);

/** Indicadores do período: atendimentos, manutenções, equipamentos problemáticos e quem atendeu. */
export const ReportsPage: React.FC = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<OperationalSummaryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    reportsService
      .getSummary(days)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar os relatórios.');
      });
    return () => {
      cancelled = true;
    };
  }, [days, reloadKey]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await reportsService.downloadCsvExport(days);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Relatórios"
        description="Resumo do período: atendimentos, manutenções e equipamentos que mais deram trabalho."
      >
        <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Período">
          {PERIODS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={days === p.days ? 'secondary' : 'ghost'}
              onClick={() => setDays(p.days)}
              className="h-7 px-3 text-xs"
              aria-pressed={days === p.days}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar CSV
        </Button>
      </PageHeader>

      {error ? (
        <ErrorState title="Não foi possível carregar os relatórios" message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Atendimentos"
              value={data.attendances_total}
              detail={`${data.attendances_resolved} resolvidos · ${data.attendances_in_progress} em andamento`}
            />
            <StatTile label="Taxa de resolução" value={`${Math.round(data.resolution_rate)}%`} detail="dos atendimentos do período" />
            <StatTile
              label="Manutenções"
              value={data.maintenances_total}
              detail={`${data.maintenances_preventive} preventivas · ${data.maintenances_corrective} corretivas`}
            />
            <StatTile label="Custo de manutenção" value={brl(data.maintenances_total_cost)} detail="informado nas manutenções" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Section
              title="Equipamentos com mais ocorrências"
              description="Atendimentos + manutenções no período. Candidatos a troca ou revisão."
            >
              {data.recurrent_equipment.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum equipamento com ocorrências repetidas.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Equipamento</th>
                      <th className="px-4 py-2 text-right font-medium">Atend.</th>
                      <th className="px-4 py-2 text-right font-medium">Manut.</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.recurrent_equipment.map((eq) => (
                      <tr key={eq.equipment_id} className="hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <a href={`#equipment?id=${eq.equipment_id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                            {eq.hostname || eq.patrimony || `Equipamento #${eq.equipment_id}`}
                          </a>
                          {eq.store_name && <p className="text-xs text-muted-foreground">{eq.store_name}</p>}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{eq.attendances_count}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{eq.maintenances_count}</td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums">{eq.total_incidents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section title="Atividade da equipe" description="Atendimentos e manutenções registrados por técnico no período.">
              {data.top_technicians.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">Sem registros no período.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Técnico</th>
                      <th className="px-4 py-2 text-right font-medium">Atend.</th>
                      <th className="px-4 py-2 text-right font-medium">Manut.</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.top_technicians.map((t) => (
                      <tr key={t.technician_id} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium text-foreground">{t.username}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{t.attendances_count}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{t.maintenances_count}</td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums">{t.total_actions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
};
