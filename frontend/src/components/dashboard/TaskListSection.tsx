import React, { useState } from 'react';
import { formatTime } from '@/lib/format';
import { PriorityBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Task } from '@/types/tasks';
import { organizationService } from '@/services/organizationService';

interface TaskListSectionProps {
  tasks: Task[];
  /** Título do card (ex.: "Minhas tarefas" ou "Tarefas abertas da equipe"). */
  title?: string;
  emptyText?: string;
  loading?: boolean;
  onNavigateToTasks?: () => void;
}

export const TaskListSection: React.FC<TaskListSectionProps> = ({ tasks: initialTasks, loading, onNavigateToTasks, title = 'Minhas tarefas', emptyText = 'Nenhuma tarefa aberta.' }) => {
  const [localTasks, setLocalTasks] = useState<Task[]>(initialTasks);

  // Sync when props change
  React.useEffect(() => {
    setLocalTasks(initialTasks);
  }, [initialTasks]);

  const toggleTask = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'concluida' ? 'pendente' : 'concluida';
    // Optimistic UI
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: newStatus,
            }
          : t
      )
    );
    try {
      await organizationService.updateTaskStatus(id, newStatus);
    } catch (err) {
      // Revert if error
      setLocalTasks(initialTasks);
      console.error('Failed to update task status', err);
    }
  };

  const getPriorityBadge = (priority: string) => <PriorityBadge priority={priority} className="uppercase text-[9px] py-0" />;

  return (
    <Card variant="default" className="h-full flex flex-col shadow-sm border-border/60">
      <CardHeader className="pb-4 px-4 pt-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <CheckSquare className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="font-heading text-base font-bold">{title}</CardTitle>
            {!loading && (
              <Badge variant="secondary" className="ml-2 font-mono text-[10px] font-bold">
                {localTasks.filter((t) => t.status !== 'concluida').length}
              </Badge>
            )}
          </div>
          {onNavigateToTasks && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToTasks}
              className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer hover:bg-muted/50"
            >
              <span>Ver todas</span>
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
        ) : localTasks.length > 0 ? (
          localTasks.map((task) => {
            const isDone = task.status === 'concluida';
            return (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id, task.status)}
                className={`group flex items-center justify-between gap-3 rounded-md p-2.5 text-sm transition-colors cursor-pointer border ${
                  isDone
                    ? 'bg-muted/20 border-transparent opacity-60'
                    : 'bg-background hover:bg-muted/40 border-border/40 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <input
                    type="checkbox"
                    role="checkbox"
                    checked={isDone}
                    onChange={() => toggleTask(task.id, task.status)}
                    className="h-4 w-4 shrink-0 rounded border-border/80 accent-primary cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="min-w-0 truncate">
                    <p className={`truncate font-semibold text-foreground transition-colors text-[13px] ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-0.5">
                      {task.category && (
                        <>
                          <span className="text-muted-foreground/80">{task.category}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{task.due_date ? formatTime(task.due_date) : 'Sem prazo'}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {getPriorityBadge(task.priority)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <AlertCircle className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-xs font-medium">{emptyText}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
