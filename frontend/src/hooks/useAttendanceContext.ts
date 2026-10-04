import { useEffect, useState } from 'react';
import { attendanceService } from '@/services/attendanceService';
import type { AttendanceContext } from '@/types/attendance';

/** Busca (com atraso) os atendimentos do mesmo chamado e o histórico do equipamento. */
export const useAttendanceContext = (otrsTicket: string, equipmentId: number | null | undefined, excludeId?: number) => {
  const [context, setContext] = useState<AttendanceContext | null>(null);
  const ticket = otrsTicket.trim();

  useEffect(() => {
    if (!ticket && !equipmentId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      attendanceService
        .getContext({ otrs_ticket: ticket || undefined, equipment_id: equipmentId, exclude_id: excludeId })
        .then((ctx) => !cancelled && setContext(ctx))
        .catch(() => {});
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ticket, equipmentId, excludeId]);

  if (!ticket && !equipmentId) return null;
  return context;
};
