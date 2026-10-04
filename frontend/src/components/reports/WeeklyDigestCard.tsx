import React from 'react';
import { AlertTriangle, CalendarRange, Package, ShoppingCart } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { WeeklyDigest } from '@/types/reports';

const AttentionLink: React.FC<{ href: string; icon: React.ElementType; text: string }> = ({ href, icon: Icon, text }) => (
  <a
    href={href}
    className="inline-flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-warning/15"
  >
    <Icon className="h-3.5 w-3.5 text-warning" />
    {text}
  </a>
);

/** "Esta semana": o mesmo resumo que os gestores recebem no sino na segunda-feira. */
export const WeeklyDigestCard: React.FC<{ digest: WeeklyDigest }> = ({ digest: d }) => {
  const max = Math.max(1, ...d.by_store.map((s) => s.count));
  const attention = [
    d.overdue_tasks > 0 && { href: '#tasks', icon: AlertTriangle, text: `${d.overdue_tasks} tarefa(s) atrasada(s)` },
    d.pending_purchases > 0 && { href: '#purchases?status=aguardando_aprovacao', icon: ShoppingCart, text: `${d.pending_purchases} compra(s) aguardando aprovação` },
    d.low_stock_items > 0 && { href: '#equipment', icon: Package, text: `${d.low_stock_items} item(ns) com estoque baixo` },
  ].filter(Boolean) as { href: string; icon: React.ElementType; text: string }[];

  return (
    <section aria-label="Resumo da semana" className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CalendarRange className="h-4 w-4 text-primary" /> Resumo da semana
        </h2>
        <p className="text-xs text-muted-foreground">
          {formatDate(d.start)} a {formatDate(d.end)} · gestores recebem no sino toda segunda-feira
        </p>
      </header>

      <p className="text-sm text-foreground">
        <span className="font-heading text-2xl font-bold tabular-nums">{d.attendances_total}</span> atendimentos
        <span className="text-muted-foreground">
          {' '}
          · {d.attendances_resolved} resolvidos · {d.attendances_open} em andamento · {d.maintenances_done} manutenções concluídas
        </span>
      </p>

      {attention.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attention.map((a) => (
            <AttentionLink key={a.href} {...a} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Lojas com mais atendimentos</h3>
          {d.by_store.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum atendimento na semana.</p>
          ) : (
            <ul className="space-y-1.5">
              {d.by_store.map((s) => (
                <li key={s.name} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-2 text-xs" title={`${s.name}: ${s.count}`}>
                  <span className="truncate text-foreground">{s.name}</span>
                  <span className="h-2 rounded-full bg-muted">
                    <span className="block h-2 rounded-full bg-primary" style={{ width: `${(s.count / max) * 100}%` }} />
                  </span>
                  <span className="text-right font-semibold tabular-nums text-foreground">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Equipamentos com atendimentos repetidos</h3>
          {d.top_equipment.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum equipamento com 2 ou mais atendimentos na semana.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {d.top_equipment.map((e) => (
                <li key={e.equipment_id} className="flex justify-between gap-2">
                  <a href={`#equipment?id=${e.equipment_id}`} className="truncate font-medium text-foreground hover:text-primary hover:underline">
                    {e.name}
                  </a>
                  <span className="font-semibold tabular-nums">{e.count}x</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
