import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock } from 'lucide-react';
import type { DashboardReminder } from '@/types/dashboard';

interface RemindersSectionProps {
  reminders: DashboardReminder[];
}

export const RemindersSection: React.FC<RemindersSectionProps> = ({ reminders }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            <CardTitle>Lembretes do Turno</CardTitle>
          </div>
          <Badge variant="warning" className="text-xs">
            {reminders.length} ativos
          </Badge>
        </div>
        <CardDescription>
          Alertas operacionais e eventos de rotina agendados:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:bg-accent/40"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Clock className="h-4 w-4" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-amber-500">
                  {reminder.time}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase font-semibold text-muted-foreground">
                  {reminder.type}
                </span>
              </div>
              <p className="text-foreground leading-snug">{reminder.text}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
