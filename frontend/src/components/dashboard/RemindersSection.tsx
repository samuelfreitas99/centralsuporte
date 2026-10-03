import React, { useState } from 'react';
import { formatDateTime } from '@/lib/format';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Reminder } from '@/types/tasks';
import { organizationService } from '@/services/organizationService';

interface RemindersSectionProps {
  reminders: Reminder[];
  loading?: boolean;
  onNavigateToReminders?: () => void;
}

export const RemindersSection: React.FC<RemindersSectionProps> = ({ reminders: initialReminders, loading, onNavigateToReminders }) => {
  const [localReminders, setLocalReminders] = useState<Reminder[]>(initialReminders);

  React.useEffect(() => {
    setLocalReminders(initialReminders);
  }, [initialReminders]);

  const toggleReminder = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'concluido' ? 'pendente' : 'concluido';
    setLocalReminders((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: newStatus } : r
      )
    );
    try {
      await organizationService.updateReminderStatus(id, newStatus);
    } catch (err) {
      setLocalReminders(initialReminders);
      console.error('Failed to update reminder status', err);
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'alerta':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Card variant="default" className="h-full flex flex-col shadow-sm border-border/60">
      <CardHeader className="pb-4 px-4 pt-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Bell className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="font-heading text-base font-bold">Lembretes</CardTitle>
            {!loading && (
              <Badge variant="secondary" className="ml-2 font-mono text-[10px] font-bold">
                {localReminders.filter(r => r.status !== 'concluido').length}
              </Badge>
            )}
          </div>
          {onNavigateToReminders && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToReminders}
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
        ) : localReminders.length > 0 ? (
          localReminders.map((reminder) => {
            const isDone = reminder.status === 'concluido';
            return (
              <div
                key={reminder.id}
                onClick={() => toggleReminder(reminder.id, reminder.status)}
                className={`flex items-start gap-3 rounded-md p-2.5 text-sm transition-colors cursor-pointer border ${
                  isDone
                    ? 'bg-muted/20 border-transparent opacity-60'
                    : 'bg-background hover:bg-muted/40 border-border/40 shadow-xs'
                }`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/50 mt-0.5">
                  {getTypeIcon(reminder.priority)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-[13px] leading-tight ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {reminder.title}
                  </p>
                  {reminder.remind_at && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(reminder.remind_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <Bell className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-xs font-medium">Sem lembretes no momento.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
