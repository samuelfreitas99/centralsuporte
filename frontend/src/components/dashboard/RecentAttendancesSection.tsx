import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Headset, ExternalLink, HardDrive, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecentAttendance } from '@/types/dashboard';

interface RecentAttendancesSectionProps {
  attendances: RecentAttendance[];
  onNavigateToAttendance?: () => void;
}

export const RecentAttendancesSection: React.FC<RecentAttendancesSectionProps> = ({
  attendances,
  onNavigateToAttendance,
}) => {
  return (
    <Card variant="ghost" className="h-full flex flex-col">
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10 text-info">
              <Headset className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="font-heading text-lg">Atendimentos Recentes</CardTitle>
          </div>
          {onNavigateToAttendance && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToAttendance}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-0 pb-0 flex-1">
        {attendances.map((item) => (
          <div
            key={item.id}
            onClick={onNavigateToAttendance}
            className="group flex flex-col gap-2 rounded-lg bg-card/40 p-3 text-sm transition-all duration-200 hover:bg-card/80 border border-transparent hover:border-info/20 cursor-pointer sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-info flex items-center gap-1">
                  {item.otrsTicket}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </span>
                <span className="text-[10px] text-muted-foreground/60">•</span>
                <span className="text-[11px] text-muted-foreground">{item.updatedAt}</span>
              </div>
              <p className="font-medium text-foreground group-hover:text-info transition-colors truncate max-w-[280px] sm:max-w-xs">{item.title}</p>
              {item.equipment && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <HardDrive className="h-3 w-3 text-muted-foreground/60" />
                  <span className="truncate">{item.equipment}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 mt-1 sm:mt-0">
              <Badge
                variant={item.status === 'Concluído' ? 'success' : 'secondary'}
                className="text-[10px] uppercase font-bold"
              >
                {item.status}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
