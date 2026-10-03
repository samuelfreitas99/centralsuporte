import React from 'react';
import { formatRelative } from '@/lib/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Headset, ExternalLink, ArrowRight, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AttendanceItem } from '@/types/attendance';

interface RecentAttendancesSectionProps {
  attendances: AttendanceItem[];
  loading?: boolean;
  onNavigateToAttendance?: (id?: number) => void;
}

export const RecentAttendancesSection: React.FC<RecentAttendancesSectionProps> = ({ attendances, loading, onNavigateToAttendance }) => {
  const getStatusBadge = (status: string) => <StatusBadge domain="attendance" status={status} className="text-[10px] uppercase py-0 leading-tight" />;

  return (
    <Card variant="default" className="h-full flex flex-col shadow-sm border-border/60">
      <CardHeader className="pb-4 px-4 pt-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Headset className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="font-heading text-base font-bold">Atendimentos</CardTitle>
          </div>
          {onNavigateToAttendance && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToAttendance?.()}
              className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer hover:bg-muted/50"
            >
              <span>Ver todos</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 py-3 flex-1 bg-card">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 mb-2 animate-spin opacity-40" />
            <p className="text-xs font-medium">Carregando...</p>
          </div>
        ) : attendances.length > 0 ? (
          attendances.map((attendance) => (
            <div
              key={attendance.id}
              onClick={() => onNavigateToAttendance?.(attendance.id)}
              className="flex items-center justify-between gap-3 rounded-md p-3 text-sm border border-border/40 bg-background hover:bg-muted/40 transition-colors shadow-xs cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {attendance.otrs_ticket ? (
                    <div
                      className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0"
                      title="Ticket OTRS associado"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      <span>{attendance.otrs_ticket}</span>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0"
                    >
                      <span>Interno</span>
                    </div>
                  )}
                  {getStatusBadge(attendance.status)}
                </div>
                <p className="truncate font-semibold text-[13px] text-foreground">
                  {attendance.title}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-1">
                  <span className="text-muted-foreground/80">{attendance.technician?.username || 'Sistema'}</span>
                  {attendance.equipment_name && (
                    <>
                      <span>•</span>
                      <span className="truncate">{attendance.equipment_name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1 justify-center text-right">
                <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  {formatRelative(attendance.updated_at)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <Info className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-xs font-medium">Nenhum atendimento listado.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
