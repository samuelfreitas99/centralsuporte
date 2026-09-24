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
    <Card className="h-full border-border/80 bg-card/75 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <CheckSquare className="h-4 w-4" />
            </div>
            <CardTitle className="font-heading text-lg">Minhas Tarefas do Turno</CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {tasks.filter((t) => t.status !== 'concluida').length} pendentes
          </Badge>
        </div>
        <CardDescription>
          Atividades operacionais prioritárias para o suporte técnico:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {tasks.map((task) => {
          const isDone = task.status === 'concluida';
          return (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`group flex items-start justify-between gap-3 rounded-xl border p-3.5 text-sm transition-all duration-200 cursor-pointer ${
                isDone
                  ? 'border-border/30 bg-muted/15 opacity-60'
                  : 'border-border/70 bg-card/90 hover:border-blue-500/30 hover:bg-white/[0.03] hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  role="checkbox"
                  checked={isDone}
                  onChange={() => toggleTask(task.id)}
                  className="mt-1 h-4 w-4 rounded border-border accent-blue-600 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="space-y-1">
                  <p className={`font-medium text-foreground transition-colors ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted/60 px-2 py-0.5 font-medium text-[11px]">{task.category}</span>
                    <span>•</span>
                    <span>Previsão: {task.dueTime}</span>
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
