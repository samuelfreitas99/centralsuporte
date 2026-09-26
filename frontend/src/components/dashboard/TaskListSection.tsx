import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardTask, TaskPriority } from '@/types/dashboard';

interface TaskListSectionProps {
  initialTasks: DashboardTask[];
  onNavigateToTasks?: () => void;
}

export const TaskListSection: React.FC<TaskListSectionProps> = ({ initialTasks, onNavigateToTasks }) => {
  const [tasks, setTasks] = useState<DashboardTask[]>(initialTasks);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === 'concluida' ? 'pendente' : 'concluida',
            }
          : t
      )
    );
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgente':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'alta':
        return <Badge variant="warning">Alta</Badge>;
      case 'media':
        return <Badge variant="secondary">Média</Badge>;
      case 'baixa':
        return <Badge variant="outline">Baixa</Badge>;
    }
  };

  return (
    <Card variant="ghost" className="h-full flex flex-col">
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CheckSquare className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="font-heading text-lg">Tarefas do Turno</CardTitle>
            <Badge variant="secondary" className="ml-2 font-mono text-[10px] uppercase">
              {tasks.filter((t) => t.status !== 'concluida').length} pendentes
            </Badge>
          </div>
          {onNavigateToTasks && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToTasks}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-0 pb-0 flex-1">
        {tasks.map((task) => {
          const isDone = task.status === 'concluida';
          return (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`group flex items-center justify-between gap-3 rounded-lg p-3 text-sm transition-all duration-200 cursor-pointer ${
                isDone
                  ? 'bg-muted/30 opacity-60'
                  : 'bg-card/40 hover:bg-card/80 border border-transparent hover:border-border/50'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <input
                  type="checkbox"
                  role="checkbox"
                  checked={isDone}
                  onChange={() => toggleTask(task.id)}
                  className="h-4 w-4 shrink-0 rounded border-border accent-primary cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="min-w-0 truncate">
                  <p className={`truncate font-medium text-foreground transition-colors ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span className="font-medium text-muted-foreground/80">{task.category}</span>
                    <span>•</span>
                    <span>{task.dueTime}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                {getPriorityBadge(task.priority)}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground bg-card/20 rounded-lg">
            <AlertCircle className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma tarefa pendente.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
