import React from 'react';
import { Check, Clock, Edit, ExternalLink, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatRelative } from '@/lib/format';
import { PriorityBadge, StatusBadge } from '@/components/ui/StatusBadge';
import type { TaskList } from '@/types/tasks';

interface TaskRowProps {
  task: TaskList;
  onOpen: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}

const isOpen = (status: string) => status === 'pendente' || status === 'em_andamento';

/** Prazo com destaque: atrasada (vermelho), vence hoje (âmbar) ou data normal. */
const DueLabel: React.FC<{ due: string; open: boolean }> = ({ due, open }) => {
  const dueDate = new Date(due);
  const now = new Date();
  const overdue = open && dueDate < now;
  const today = open && !overdue && dueDate.toDateString() === now.toDateString();
  return (
    <span
      className={cn(
        'flex items-center gap-1',
        overdue && 'font-semibold text-destructive',
        today && 'font-semibold text-amber-500'
      )}
    >
      <Clock className="h-3 w-3" />
      {overdue ? `Atrasada · vencia ${formatDate(due)}` : today ? `Vence ${formatRelative(due)}` : `Prazo ${formatRelative(due)}`}
    </span>
  );
};

/** Linha da lista de tarefas: concluir com um clique, abrir o detalhe clicando no título. */
export const TaskRow: React.FC<TaskRowProps> = ({ task, onOpen, onToggleDone, onEdit, onDelete, canEdit }) => {
  const open = isOpen(task.status);
  const done = task.status === 'concluida';
  const assignees = task.assigned_users.map((u) => u.full_name?.split(' ')[0] || u.username).join(', ');

  return (
    <div className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
      <button
        type="button"
        onClick={onToggleDone}
        disabled={!canEdit || task.status === 'cancelada'}
        aria-label={done ? 'Reabrir tarefa' : 'Marcar como concluída'}
        title={done ? 'Reabrir tarefa' : 'Marcar como concluída'}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
          done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/40 hover:border-emerald-500'
        )}
      >
        {done && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              'text-left text-sm font-semibold hover:underline cursor-pointer',
              done || task.status === 'cancelada' ? 'text-muted-foreground line-through' : 'text-foreground'
            )}
          >
            {task.title}
          </button>
          <PriorityBadge priority={task.priority} className="h-4 py-0 text-[10px]" />
          {task.status !== 'pendente' && <StatusBadge domain="task" status={task.status} className="h-4 py-0 text-[10px]" />}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {task.due_date && <DueLabel due={task.due_date} open={open} />}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {assignees || 'Sem responsável'}
          </span>
          {task.otrs_reference && (
            <span className="flex items-center gap-1 text-primary" title="Chamado no OTRS">
              <ExternalLink className="h-3 w-3" />
              {task.otrs_reference}
            </span>
          )}
          {task.category && <span>{task.category}</span>}
        </div>
      </div>

      {canEdit && (
        <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Editar tarefa"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            aria-label="Excluir tarefa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
