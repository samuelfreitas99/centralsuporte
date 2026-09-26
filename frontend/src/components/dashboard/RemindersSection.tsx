import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { Bell, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardReminder } from '@/types/dashboard';

interface RemindersSectionProps {
  reminders: DashboardReminder[];
  onNavigateToReminders?: () => void;
}

export const RemindersSection: React.FC<RemindersSectionProps> = ({ reminders, onNavigateToReminders }) => {
  return (
    <Card variant="ghost" className="h-full flex flex-col">
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Bell className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="font-heading text-lg">Lembretes</CardTitle>
          </div>
          {onNavigateToReminders && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToReminders}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <span>Todos</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-0 pb-0 flex-1">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            onClick={onNavigateToReminders}
            className="flex items-start gap-3 rounded-lg bg-card/40 p-3 text-sm transition-all duration-200 hover:bg-card/80 border border-transparent hover:border-warning/20 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning mt-0.5">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-warning">
                  {reminder.time}
                </span>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground/70 tracking-wider">
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
