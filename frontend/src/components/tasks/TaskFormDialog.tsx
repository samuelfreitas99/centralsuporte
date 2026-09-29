import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectSelect } from '@/components/projects/ProjectSelect';
import type { Task, TaskCreatePayload, TaskUpdatePayload } from '@/types/tasks';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskToEdit?: Task | null;
  initialProjectId?: number | null;
  initialProjectName?: string;
  onSave: (payload: TaskCreatePayload | TaskUpdatePayload) => Promise<void>;
}

export const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
  open,
  onOpenChange,
  taskToEdit,
  initialProjectId,
  initialProjectName,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [status, setStatus] = useState('pendente');
  const [visibility, setVisibility] = useState('equipe');
  const [category, setCategory] = useState('');
  const [otrsReference, setOtrsReference] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectStage, setProjectStage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
      setVisibility(taskToEdit.visibility);
      setCategory(taskToEdit.category || '');
      setOtrsReference(taskToEdit.otrs_reference || '');
      setDueDate(taskToEdit.due_date ? taskToEdit.due_date.substring(0, 16) : '');
      setProjectId(taskToEdit.project_id || null);
      setProjectStage(taskToEdit.project_stage || '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('media');
      setStatus('pendente');
      setVisibility('equipe');
      setCategory('Infraestrutura');
      setOtrsReference('');
      setDueDate('');
      setProjectId(initialProjectId || null);
      setProjectStage('');
    }
    setError(null);
  }, [taskToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O título da tarefa é obrigatório.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: TaskCreatePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        visibility,
        category: category.trim() || undefined,
        otrs_reference: otrsReference.trim() || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        project_id: projectId,
        project_stage: projectId ? (projectStage.trim() || undefined) : undefined,
      };

      await onSave(payload);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar a tarefa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa Operacional'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Título da Tarefa <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Verificar switch do rack 02"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Descrição / Procedimentos</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as instruções operacionais ou contexto..."
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Prioridade</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={loading}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Status</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
              >
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Categoria</label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Redes, PDV, Servidores"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Referência OTRS <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                value={otrsReference}
                onChange={(e) => setOtrsReference(e.target.value)}
                placeholder="Ex: Ticket#20260924001"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Projeto Operacional</label>
              <ProjectSelect
                value={projectId}
                onChange={(id) => {
                  setProjectId(id);
                  if (!id) setProjectStage('');
                }}
                disabled={loading}
                lockedContextName={initialProjectName}
              />
            </div>

            {projectId && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Etapa do Projeto</label>
                <Input
                  value={projectStage}
                  onChange={(e) => setProjectStage(e.target.value)}
                  placeholder="Ex: Infraestrutura, Rede"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Prazo / Conclusão Esperada</label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Visibilidade</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                disabled={loading}
              >
                <option value="equipe">Equipe Técnica</option>
                <option value="todos">Todos</option>
                <option value="privado">Apenas Privado</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : taskToEdit ? 'Salvar Alterações' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
