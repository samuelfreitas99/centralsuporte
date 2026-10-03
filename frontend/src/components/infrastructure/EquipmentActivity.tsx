import React, { useEffect, useState } from 'react';
import { ExternalLink, Headset, Loader2, Plus, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { attendanceService } from '@/services/attendanceService';
import { maintenanceService } from '@/services/maintenanceService';
import type { AttendanceItem } from '@/types/attendance';
import type { MaintenanceRecord } from '@/types/maintenance';

interface EquipmentActivityProps {
  equipmentId: number;
  canRegisterAttendance: boolean;
  canScheduleMaintenance?: boolean;
}

interface ActivityRow {
  key: string;
  kind: 'attendance' | 'maintenance';
  id: number;
  title: string;
  date: string;
  status: string;
  otrs?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
  cancelado: 'Cancelado',
  agendada: 'Agendada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const go = (target: string) => {
  window.location.hash = target;
};

/**
 * Tudo o que aconteceu com um equipamento: atendimentos vinculados e manutenções (individuais ou em lote),
 * do mais recente para o mais antigo. Cada linha abre o registro original.
 */
export const EquipmentActivity: React.FC<EquipmentActivityProps> = ({
  equipmentId,
  canRegisterAttendance,
  canScheduleMaintenance = false,
}) => {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      attendanceService
        .getAttendances({ equipment_id: equipmentId, limit: 100 })
        .then((r) => r.items)
        .catch(() => [] as AttendanceItem[]),
      maintenanceService
        .getMaintenances({ equipment_id: equipmentId, limit: 100 })
        .then((r) => r.items)
        .catch(() => [] as MaintenanceRecord[]),
    ]).then(([attendances, maintenances]) => {
      if (cancelled) return;
      const merged: ActivityRow[] = [
        ...attendances.map((a) => ({
          key: `a-${a.id}`,
          kind: 'attendance' as const,
          id: a.id,
          title: a.title,
          date: a.created_at,
          status: a.status,
          otrs: a.otrs_ticket,
        })),
        ...maintenances.map((m) => ({
          key: `m-${m.id}`,
          kind: 'maintenance' as const,
          id: m.id,
          title: m.title,
          date: m.performed_date || m.scheduled_date || m.created_at,
          status: m.status,
          otrs: m.otrs_ticket,
        })),
      ].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
      setRows(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [equipmentId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Atendimentos e manutenções deste equipamento.</p>
        <div className="flex flex-wrap gap-2">
        {canScheduleMaintenance && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs cursor-pointer"
            onClick={() => go(`maintenances?new=true&equipment_id=${equipmentId}`)}
          >
            <Wrench className="h-3.5 w-3.5" />
            Agendar manutenção
          </Button>
        )}
        {canRegisterAttendance && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs cursor-pointer"
            onClick={() => go(`attendance?new=true&equipment_id=${equipmentId}`)}
          >
            <Plus className="h-3.5 w-3.5" />
            Registrar atendimento
          </Button>
        )}
        </div>
      </div>

      {rows === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 py-8 text-center text-xs text-muted-foreground">
          Nenhum atendimento ou manutenção registrado para este equipamento.
        </p>
      ) : (
        <ul className="divide-y divide-border/50 rounded-lg border border-border/60">
          {rows.map((row) => {
            const Icon = row.kind === 'attendance' ? Headset : Wrench;
            return (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => go(`${row.kind === 'attendance' ? 'attendance' : 'maintenances'}?id=${row.id}`)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 cursor-pointer"
                >
                  <Icon className={row.kind === 'attendance' ? 'h-4 w-4 shrink-0 text-sky-500' : 'h-4 w-4 shrink-0 text-orange-500'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.kind === 'attendance' ? 'Atendimento' : 'Manutenção'} ·{' '}
                      {new Date(row.date).toLocaleDateString('pt-BR')}
                      {row.otrs && ` · OTRS ${row.otrs}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {STATUS_LABEL[row.status] ?? row.status}
                  </Badge>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
