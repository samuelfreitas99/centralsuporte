import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Headset, ExternalLink, HardDrive } from 'lucide-react';
import type { RecentAttendance } from '@/types/dashboard';

interface RecentAttendancesSectionProps {
  attendances: RecentAttendance[];
}

export const RecentAttendancesSection: React.FC<RecentAttendancesSectionProps> = ({
  attendances,
}) => {
  return (
    <Card className="h-full border-border/80 bg-card/75 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Headset className="h-4 w-4" />
            </div>
            <CardTitle className="font-heading text-lg">Atendimentos Recentes</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs border-border/80 bg-background/50">
            Ref. OTRS
          </Badge>
        </div>
        <CardDescription>
          Registros operacionais e diagnósticos vinculados aos chamados oficiais:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {attendances.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/90 p-3.5 text-sm transition-all duration-200 hover:border-blue-500/30 hover:bg-white/[0.03] hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-blue-400 flex items-center gap-1 hover:underline cursor-pointer">
                  {item.otrsTicket}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{item.updatedAt}</span>
              </div>
              <p className="font-medium text-foreground">{item.title}</p>
              {item.equipment && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                  <span>{item.equipment}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Badge
                variant={item.status === 'Concluído' ? 'success' : 'secondary'}
                className="text-xs"
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
