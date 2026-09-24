import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, AlertCircle } from 'lucide-react';
import type { DashboardTask, TaskPriority } from '@/types/dashboard';

interface TaskListSectionProps {
  initialTasks: DashboardTask[];
}

export const TaskListSection: React.FC<TaskListSectionProps> = ({ initialTasks }) => {
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <CardTitle>Minhas Tarefas do Turno</CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {tasks.filter((t) => t.status !== 'concluida').length} pendentes
          </Badge>
        </div>
        <CardDescription>
          Atividades internas prioritárias para execução no suporte hoje:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const isDone = task.status === 'concluida';
          return (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm transition-colors cursor-pointer ${
                isDone
                  ? 'border-border/40 bg-muted/20 opacity-60'
                  : 'border-border bg-card hover:bg-accent/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleTask(task.id)}
                  className="mt-1 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="space-y-1">
                  <p className={`font-medium text-foreground ${isDone ? 'line-through' : ''}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">{task.category}</span>
                    <span>•</span>
                    <span>Horário previsto: {task.dueTime}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {getPriorityBadge(task.priority)}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p>Nenhuma tarefa atribuída no momento.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
