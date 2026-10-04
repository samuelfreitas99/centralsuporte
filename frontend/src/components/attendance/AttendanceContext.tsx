import React from 'react';
import { AlertTriangle, History } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/format';
import type { AttendanceBrief } from '@/types/attendance';

const BriefItem: React.FC<{ item: AttendanceBrief; showSolution?: boolean }> = ({ item, showSolution }) => (
  <li className="space-y-0.5 py-2 first:pt-0 last:pb-0">
    <div className="flex items-start justify-between gap-2">
      <a href={`#attendance?id=${item.id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-foreground hover:text-primary hover:underline">
        #{item.id} {item.title}
      </a>
      <StatusBadge domain="attendance" status={item.status} className="shrink-0 text-[10px]" />
    </div>
    <p className="text-[11px] text-muted-foreground">
      {formatDate(item.created_at)}
      {item.technician_name && ` · ${item.technician_name}`}
    </p>
    {showSolution && item.solution && (
      <p className="whitespace-pre-wrap rounded-md bg-success/5 px-2 py-1 text-[11px] text-foreground">
        <span className="font-semibold text-success">Solução: </span>
        {item.solution}
      </p>
    )}
  </li>
);

/** Aviso de chamado OTRS já registrado em outro atendimento. */
export const SameTicketWarning: React.FC<{ items: AttendanceBrief[] }> = ({ items }) =>
  items.length ? (
    <div role="status" className="rounded-xl border border-warning/40 bg-warning/10 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
        Este chamado já tem {items.length === 1 ? 'um atendimento' : `${items.length} atendimentos`} — talvez seja melhor adicionar uma nota nele.
      </p>
      <ul className="divide-y divide-border/40">
        {items.map((a) => (
          <BriefItem key={a.id} item={a} />
        ))}
      </ul>
    </div>
  ) : null;

/** Últimos atendimentos do equipamento, com a solução aplicada. */
export const EquipmentHistory: React.FC<{ items: AttendanceBrief[] }> = ({ items }) =>
  items.length ? (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <History className="h-3.5 w-3.5 text-primary" />
        Últimos atendimentos deste equipamento
      </p>
      <ul className="max-h-64 divide-y divide-border/40 overflow-y-auto">
        {items.map((a) => (
          <BriefItem key={a.id} item={a} showSolution />
        ))}
      </ul>
    </div>
  ) : null;
