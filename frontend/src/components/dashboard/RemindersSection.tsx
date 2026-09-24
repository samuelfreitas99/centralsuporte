import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardReminder } from '@/types/dashboard';

interface RemindersSectionProps {
  reminders: DashboardReminder[];
  onNavigateToReminders?: () => void;
}

export const RemindersSection: React.FC<RemindersSectionProps> = ({ reminders, onNavigateToReminders }) => {
  return (
    <Card className="h-full border-border/70 bg-card/70 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/10 text-warning border border-warning/20">
              <Bell className="h-4 w-4" />
            </div>
            <CardTitle className="font-heading text-lg">Lembretes do Turno</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="text-xs">
              {reminders.length} ativos
            </Badge>
            {onNavigateToReminders && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateToReminders}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <span>Ver</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Alertas operacionais e rotinas agendadas:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            onClick={onNavigateToReminders}
            className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/85 p-3 text-sm transition-all duration-200 hover:border-warning/30 hover:bg-card cursor-pointer"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning border border-warning/20">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-warning">
                  {reminder.time}
                </span>
                <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-muted-foreground">
                  {reminder.type}
                </span>
              </div>
              <p className="text-xs text-foreground leading-snug">{reminder.text}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
