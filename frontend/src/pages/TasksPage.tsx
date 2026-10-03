import React, { useState, useEffect, useCallback } from 'react';
import { TaskRow } from '@/components/tasks/TaskRow';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar, FilterSelect } from '@/components/ui/FilterBar';
import { statusOptions, priorityOptions } from '@/lib/status';
import { useConfirm } from '@/hooks/useConfirm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  Plus,
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
  const [totalPages, setTotalPages] = useState(1);
  const { page, limit, setPage, updateHashParams } = usePagination(50);

  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('tasks:write');
  const [debouncedSearch, setDebouncedSearch] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('search') || '');
  // Padrão: só as tarefas abertas (pendentes e em andamento), em ordem de prazo. "todas" = sem filtro.
  const [statusFilter, setStatusFilter] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('status') || 'abertas');
  const [priorityFilter, setPriorityFilter] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('priority') || '');

  // Dialogs state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);


  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await organizationService.getTasks({
        status: statusFilter && statusFilter !== 'todas' ? statusFilter : undefined,
        priority: priorityFilter || undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setTasks(data.items);
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


  return (
    <div className="space-y-6">
      <PageHeader icon={CheckSquare} title="Tarefas e Agenda" description="Tarefas da equipe com checklists, seus lembretes e a agenda." />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="flex-1 flex flex-col min-h-[500px]">
            <div className="p-4 pb-3">
              <FilterBar
                bare
                search={debouncedSearch}
                onSearch={(value) => {
                  setDebouncedSearch(value);
                  updateHashParams({ search: value || null, page: null });
                }}
                placeholder="Buscar tarefa ou chamado OTRS..."
              >
                <FilterSelect
                  label="Status"
                  value={statusFilter === 'todas' ? 'all' : statusFilter}
                  onChange={(value) => handleStatusFilterChange(value === 'all' ? 'todas' : value)}
                  options={[{ value: 'abertas', label: 'Abertas' }, ...statusOptions('task')]}
                />
                <FilterSelect
                  label="Prioridade"
                  value={priorityFilter || 'all'}
                  onChange={(value) => handlePriorityFilterChange(value === 'all' ? '' : value)}
                  options={priorityOptions()}
                />
                <Button size="sm" onClick={openCreateDialog} className="flex items-center gap-1.5 h-9 shrink-0">
                  <Plus className="h-4 w-4" />
                  <span>Nova tarefa</span>
                </Button>
              </FilterBar>
            </div>

            <CardContent className="p-0 border-t border-border/50 flex-1 flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Carregando tarefas...
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                  <CheckSquare className="h-8 w-8 text-muted-foreground/40 mb-1" />
                  <p className="font-semibold text-foreground">
                    {statusFilter === 'abertas' && !debouncedSearch && !priorityFilter ? 'Nenhuma tarefa aberta. Tudo em dia!' : 'Nenhuma tarefa encontrada com esses filtros.'}
                  </p>
                  <Button size="sm" variant="outline" onClick={openCreateDialog} className="mt-2 text-xs">
                    Nova tarefa
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border/50 flex-1">
                    {tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        canEdit={canEdit}
                        onOpen={() => openDetailDrawer(task.id)}
                        onToggleDone={() => handleStatusChange(task.id, task.status === 'concluida' ? 'pendente' : 'concluida')}
                        onEdit={() => openEditDialog(task.id)}
                        onDelete={() => handleDeleteTask(task.id)}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="p-4 border-t border-border/50">
                      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                  )}
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
