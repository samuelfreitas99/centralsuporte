import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useConfirm } from '@/hooks/useConfirm';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import {
  CheckSquare,
  Plus,
  Search,
  ExternalLink,
  Clock,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react';
import type { Task, TaskList, TaskCreatePayload, TaskUpdatePayload } from '@/types/tasks';
import { organizationService } from '@/services/organizationService';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { RemindersSection } from '@/components/tasks/RemindersSection';
import { CalendarSection } from '@/components/tasks/CalendarSection';
import { usePagination } from '@/hooks/usePagination';
import { useDeepLinkId, clearDeepLinkId } from '@/hooks/useDeepLink';
import { Pagination } from '@/components/ui/Pagination';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskList[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { page, limit, setPage, updateHashParams } = usePagination(50);

  const [loading, setLoading] = useState(true);
  const [searchTermInput, setSearchTermInput] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTermInput);
  const [statusFilter, setStatusFilter] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('priority') || '');

  // Dialogs state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTermInput);
      if (searchTermInput !== debouncedSearch) {
        setPage(1); // Reset page on search change
        updateHashParams({ search: searchTermInput || null, page: '1' });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTermInput, debouncedSearch, setPage, updateHashParams]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await organizationService.getTasks({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setTasks(data.items);
      setTotalTasks(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error('Falha ao buscar tarefas:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, debouncedSearch, page, limit]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    updateHashParams({ status: val || null, page: '1' });
  };

  const handlePriorityFilterChange = (val: string) => {
    setPriorityFilter(val);
    updateHashParams({ priority: val || null, page: '1' });
  };

  const handleSaveTask = async (payload: TaskCreatePayload | TaskUpdatePayload) => {
    if (taskToEdit) {
      await organizationService.updateTask(taskToEdit.id, payload);
    } else {
      await organizationService.createTask(payload as TaskCreatePayload);
    }
    loadTasks();
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await organizationService.updateTaskStatus(taskId, newStatus);
      loadTasks();
    } catch (err) {
      console.error('Falha ao atualizar status:', err);
    }
  };

  const confirm = useConfirm();

  const handleDeleteTask = async (taskId: number) => {
    if (!(await confirm({ title: 'Excluir tarefa?', description: 'Os checklists da tarefa também serão excluídos.' }))) return;
    try {
      await organizationService.deleteTask(taskId);
      if (selectedTaskId === taskId) {
        setDetailDrawerOpen(false);
        setSelectedTaskId(null);
      }
      loadTasks();
    } catch (err) {
      console.error('Falha ao excluir tarefa:', err);
    }
  };

  const openCreateDialog = () => {
    setTaskToEdit(null);
    setFormDialogOpen(true);
  };

  const openEditDialog = async (taskId: number) => {
    try {
      const fullTask = await organizationService.getTaskById(taskId);
      setTaskToEdit(fullTask);
      setFormDialogOpen(true);
    } catch (err) {
      console.error('Failed to load full task for editing', err);
    }
  };

  const openDetailDrawer = (taskId: number) => {
    setSelectedTaskId(taskId);
    setDetailDrawerOpen(true);
  };

  // #tasks?id=N (busca global, Início, links de outras telas)
  useDeepLinkId('tasks', openDetailDrawer);

  const handleDetailDrawerChange = (open: boolean) => {
    setDetailDrawerOpen(open);
    if (!open) clearDeepLinkId();
  };

  const getTaskPriorityVariant = (priority: string): BadgeProps['variant'] => {
    if (priority === 'urgente') return 'destructive';
    if (priority === 'alta') return 'warning';
    if (priority === 'baixa') return 'secondary';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={CheckSquare} title="Tarefas e Agenda" description="Tarefas da equipe com checklists, seus lembretes e a agenda." />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">Total de Registros</span>
              <p className="text-2xl font-bold text-foreground mt-1">{totalTasks}</p>
            </div>
          </div>

          <Card className="flex-1 flex flex-col min-h-[500px]">
            <CardHeader className="p-4 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar tarefas ou OTRS..."
                      value={searchTermInput}
                      onChange={(e) => setSearchTermInput(e.target.value)}
                      className="pl-8 h-9 text-xs bg-muted/30"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    className="h-9 rounded-md border border-input bg-muted/30 px-2.5 text-xs text-foreground font-medium"
                  >
                    <option value="">Todos os Status</option>
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => handlePriorityFilterChange(e.target.value)}
                    className="h-9 rounded-md border border-input bg-muted/30 px-2.5 text-xs text-foreground font-medium"
                  >
                    <option value="">Prioridades</option>
                    <option value="urgente">Urgente</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>

                <Button size="sm" onClick={openCreateDialog} className="flex items-center gap-1.5 h-9 shrink-0">
                  <Plus className="h-4 w-4" />
                  <span>Nova Tarefa</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 border-t border-border/50 flex-1 flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Carregando tarefas operacionais...
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                  <CheckSquare className="h-8 w-8 text-muted-foreground/40 mb-1" />
                  <p className="font-semibold text-foreground">Nenhuma tarefa encontrada.</p>
                  <Button size="sm" variant="outline" onClick={openCreateDialog} className="mt-2 text-xs">
                    Criar Primeira Tarefa
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border/50 flex-1">
                    {tasks.map((task) => {
                      return (
                        <div
                          key={task.id}
                          className="p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-bold cursor-pointer hover:underline ${
                                  task.status === 'concluida' ? 'line-through text-muted-foreground' : 'text-foreground'
                                }`}
                                onClick={() => openDetailDrawer(task.id)}
                              >
                                {task.title}
                              </span>

                              <Badge
                                variant={getTaskPriorityVariant(task.priority)}
                                className="text-[10px] py-0 h-4 uppercase"
                              >
                                {task.priority}
                              </Badge>

                              {task.category && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 bg-background">
                                  {task.category}
                                </Badge>
                              )}

                              {task.otrs_reference && (
                                <div
                                  className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0"
                                  title="Chamado oficial associado no OTRS"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                  <span>{task.otrs_reference}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
                              {task.due_date && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Prazo: {new Date(task.due_date).toLocaleString('pt-BR')}</span>
                                </div>
                              )}

                              <div>
                                <span>Criado por: {task.creator?.username || 'Suporte'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            <select
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            >
                              <option value="pendente">Pendente</option>
                              <option value="em_andamento">Em Andamento</option>
                              <option value="concluida">Concluída</option>
                              <option value="cancelada">Cancelada</option>
                            </select>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs flex items-center gap-1"
                              onClick={() => openDetailDrawer(task.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Detalhes</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditDialog(task.id)}
                              title="Editar tarefa"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteTask(task.id)}
                              title="Excluir tarefa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="p-4 border-t border-border/50">
                    <Pagination 
                      currentPage={page} 
                      totalPages={totalPages} 
                      onPageChange={setPage} 
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 flex flex-col">
          <div className="flex-1 min-h-[350px] max-h-[500px]">
            <RemindersSection />
          </div>
          <div className="flex-1 min-h-[350px] max-h-[500px]">
            <CalendarSection />
          </div>
        </div>
      </div>

      <TaskFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        taskToEdit={taskToEdit}
        onSave={handleSaveTask}
      />

      <TaskDetailDrawer
        taskId={selectedTaskId}
        open={detailDrawerOpen}
        onOpenChange={handleDetailDrawerChange}
        onTaskUpdated={loadTasks}
        onEditTask={(task: Task) => {
          setDetailDrawerOpen(false);
          setTaskToEdit(task);
          setFormDialogOpen(true);
        }}
      />
    </div>
  );
};
