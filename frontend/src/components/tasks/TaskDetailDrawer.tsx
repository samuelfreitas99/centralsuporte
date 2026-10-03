import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckSquare,
  Square,
  Clock,
  ExternalLink,
  Plus,
  Calendar,
  User as UserIcon,
  Users,
  Briefcase,
} from 'lucide-react';
import type { Task } from '@/types/tasks';
import { organizationService } from '@/services/organizationService';
import { useAuth } from '@/hooks/useAuth';
import { AttachmentManager } from '@/components/attachments/AttachmentManager';

interface TaskDetailDrawerProps {
  taskId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
  onEditTask: (task: Task) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskId,
  open,
  onOpenChange,
  onTaskUpdated,
  onEditTask,
}) => {
  const [loadedTask, setLoadedTask] = useState<Task | null>(null);

  const [newItemTitle, setNewItemTitle] = useState('');
  const [activeChecklistId, setActiveChecklistId] = useState<number | null>(null);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const { hasPermission } = useAuth();

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoadedTask(await organizationService.getTaskById(taskId));
    } catch (err) {
      console.error('Falha ao carregar tarefa:', err);
    }
  }, [taskId]);

  useEffect(() => {
    if (open && taskId) loadTask();
  }, [open, taskId, loadTask]);

  // Recarrega o próprio drawer e avisa a tela pai (lista) para se atualizar.
  const refresh = () => {
    loadTask();
    onTaskUpdated();
  };

  // Evita exibir a tarefa anterior enquanto a nova é carregada.
  const task = loadedTask && loadedTask.id === taskId ? loadedTask : null;
  if (!task) return null;

  const handleToggleItem = async (checklistId: number, itemId: number, currentCompleted: boolean) => {
    try {
      setLoadingAction(true);
      await organizationService.updateChecklistItem(checklistId, itemId, {
        is_completed: !currentCompleted,
      });
      refresh();
    } catch (err) {
      console.error('Falha ao atualizar item de checklist:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddItem = async (checklistId: number) => {
    if (!newItemTitle.trim()) return;
    try {
      setLoadingAction(true);
      await organizationService.addChecklistItem(checklistId, newItemTitle.trim());
      setNewItemTitle('');
      setActiveChecklistId(null);
      refresh();
    } catch (err) {
      console.error('Falha ao adicionar item:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      setLoadingAction(true);
      await organizationService.createChecklist({
        title: newChecklistTitle.trim(),
        task_id: task.id,
      });
      setNewChecklistTitle('');
      setShowAddChecklist(false);
      refresh();
    } catch (err) {
      console.error('Falha ao criar checklist:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoadingAction(true);
      await organizationService.updateTaskStatus(task.id, newStatus);
      refresh();
    } catch (err) {
      console.error('Falha ao alterar status:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'alta':
        return <Badge variant="warning">Alta</Badge>;
      case 'baixa':
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="default">Média</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluida':
        return <Badge variant="success">Concluída</Badge>;
      case 'em_andamento':
        return <Badge variant="warning">Em Andamento</Badge>;
      case 'cancelada':
        return <Badge variant="secondary">Cancelada</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="xl" className="overflow-y-auto">
        <DrawerHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between gap-2 pr-6">
            <DrawerTitle className="text-xl font-bold leading-tight">{task.title}</DrawerTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {getStatusBadge(task.status)}
            {getPriorityBadge(task.priority)}
            {task.category && (
              <Badge variant="outline" className="text-xs">
                {task.category}
              </Badge>
            )}
            {task.otrs_reference && (
              <div className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                <ExternalLink className="h-3 w-3" />
                <span>OTRS: {task.otrs_reference}</span>
              </div>
            )}
          </div>
        </DrawerHeader>

        <div className="space-y-5 py-3">
          {/* Descrição */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Procedimento / Instruções
            </h4>
            <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm text-foreground whitespace-pre-line leading-relaxed">
              {task.description || 'Nenhuma instrução detalhada informada.'}
            </div>
          </div>

          {/* Metadados */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-muted-foreground bg-muted/20 border border-border/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-foreground/70" />
              <div>
                <p className="font-semibold text-foreground">Criado por</p>
                <p>{task.creator?.username || 'Sistema'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-foreground/70" />
              <div>
                <p className="font-semibold text-foreground">Prazo</p>
                <p>{task.due_date ? new Date(task.due_date).toLocaleString('pt-BR') : 'Sem prazo'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-foreground/70" />
              <div>
                <p className="font-semibold text-foreground">Concluído em</p>
                <p>{task.completed_at ? new Date(task.completed_at).toLocaleString('pt-BR') : '-'}</p>
              </div>
            </div>

            {task.assigned_users && task.assigned_users.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-foreground/70" />
                <div>
                  <p className="font-semibold text-foreground">Responsáveis</p>
                  <p>{task.assigned_users.map(u => u.username).join(', ')}</p>
                </div>
              </div>
            )}

            {task.project_stage && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-foreground/70" />
                <div>
                  <p className="font-semibold text-foreground">Etapa do Projeto</p>
                  <p>{task.project_stage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Checklists Vinculados */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span>Checklists Operacionais</span>
              </h4>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex items-center gap-1"
                onClick={() => setShowAddChecklist(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar Checklist</span>
              </Button>
            </div>

            {showAddChecklist && (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/40">
                <Input
                  size={1}
                  className="h-8 text-xs flex-1"
                  placeholder="Nome do novo checklist (Ex: Procedimentos Físicos)"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  autoFocus
                />
                <Button size="sm" className="h-8 text-xs" onClick={handleCreateChecklist} disabled={loadingAction}>
                  Criar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setShowAddChecklist(false)}
                >
                  Cancelar
                </Button>
              </div>
            )}

            {task.checklists && task.checklists.length > 0 ? (
              <div className="space-y-4">
                {task.checklists.map((chk) => (
                  <div key={chk.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{chk.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {chk.items.filter((i) => i.is_completed).length} / {chk.items.length} concluídos
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {chk.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => handleToggleItem(chk.id, item.id, item.is_completed)}
                        >
                          <div className="flex items-center gap-2.5 flex-1">
                            {item.is_completed ? (
                              <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground" />
                            )}
                            <span
                              className={`text-xs ${
                                item.is_completed
                                  ? 'line-through text-muted-foreground'
                                  : 'text-foreground font-medium'
                              }`}
                            >
                              {item.title}
                            </span>
                          </div>
                          {item.completed_at && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(item.completed_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {activeChecklistId === chk.id ? (
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          size={1}
                          className="h-7 text-xs flex-1"
                          placeholder="Novo item de conferência..."
                          value={newItemTitle}
                          onChange={(e) => setNewItemTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddItem(chk.id)}
                          autoFocus
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleAddItem(chk.id)}>
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setActiveChecklistId(null)}
                        >
                          X
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveChecklistId(chk.id)}
                        className="text-xs text-primary font-medium hover:underline flex items-center gap-1 pt-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Adicionar item ao checklist</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                Nenhum checklist associado a esta tarefa. Adicione um para guiar o procedimento passo a passo.
              </div>
            )}
          </div>

          {/* Anexos */}
          <div className="pt-2">
            <AttachmentManager
              entityType="task"
              entityId={task.id}
              readOnly={!hasPermission('tasks:write')}
              compact
            />
          </div>

          {/* Ações de Status da Tarefa */}
          <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Alterar Status:</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={loadingAction}
              >
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEditTask(task);
                }}
              >
                Editar Detalhes
              </Button>
              <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
