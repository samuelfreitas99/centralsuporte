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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headset className="h-5 w-5 text-primary" />
            <CardTitle>Atendimentos Recentes</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Ref. OTRS
          </Badge>
        </div>
        <CardDescription>
          Registros operacionais e diagnósticos vinculados aos chamados oficiais:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {attendances.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5 text-sm transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary flex items-center gap-1">
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
