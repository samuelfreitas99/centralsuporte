import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/Toast';
import { projectService } from '@/services/projectService';
import type { Project, ProjectCreatePayload, ProjectUpdatePayload } from '@/types/projects';
import { infrastructureService } from '@/services/infrastructureService';
import { useAuth } from '@/hooks/useAuth';

interface ProjectFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSaved: () => void;
}

export const ProjectFormDrawer: React.FC<ProjectFormDrawerProps> = ({
  open,
  onOpenChange,
  project,
  onSaved,
}) => {
  const { success, error: toastError } = useToast();
  useAuth();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<{id: number, name: string}[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'planejado',
    target_date: '',
    store_id: '',
  });

  useEffect(() => {
    if (open) {
      loadStores();
      if (project) {
        setFormData({
          title: project.title,
          description: project.description || '',
          status: project.status,
          target_date: project.target_date ? project.target_date.split('T')[0] : '',
          store_id: project.store_id?.toString() || '',
        });
      } else {
        setFormData({
          title: '',
          description: '',
          status: 'planejado',
          target_date: '',
          store_id: '',
        });
      }
    }
  }, [open, project]);

  const loadStores = async () => {
    try {
      const data = await infrastructureService.getStores();
      setStores(data);
    } catch (err) {
      console.error('Failed to load stores', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      setLoading(true);
      const storeId = formData.store_id ? parseInt(formData.store_id, 10) : undefined;
      const targetDate = formData.target_date ? new Date(formData.target_date).toISOString() : undefined;

      if (project) {
        const payload: ProjectUpdatePayload = {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          store_id: storeId || null,
          target_date: targetDate,
        };
        await projectService.updateProject(project.id, payload);
        success('Projeto atualizado com sucesso!');
      } else {
        const payload: ProjectCreatePayload = {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          store_id: storeId,
          target_date: targetDate,
        };
        await projectService.createProject(payload);
        success('Projeto criado com sucesso!');
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toastError('Erro ao salvar projeto', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-md mx-auto fixed right-0 inset-y-0 w-full sm:w-[450px] rounded-none border-l border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="flex flex-col h-full">
          <DrawerHeader className="border-b border-border/50 bg-background/50 text-left">
            <DrawerTitle className="font-heading text-xl">
              {project ? 'Editar Projeto' : 'Novo Projeto'}
            </DrawerTitle>
            <DrawerDescription>
              {project ? 'Atualize as informações do projeto.' : 'Crie um novo projeto operacional.'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-grow overflow-y-auto p-6">
            <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Título *</label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Abertura Loja 42"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Unidade (Loja)</label>
                <select
                  name="store_id"
                  value={formData.store_id}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecione uma loja...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="planejado">Planejado</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="pausado">Pausado</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data Prevista (Opcional)</label>
                <Input
                  type="date"
                  name="target_date"
                  value={formData.target_date}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Descrição</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Escopo geral do projeto..."
                  className="min-h-[120px]"
                />
              </div>
            </form>
          </div>

          <DrawerFooter className="border-t border-border/50 bg-background/50">
            <div className="flex gap-2 justify-end w-full">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="project-form" disabled={loading || !formData.title}>
                {loading ? 'Salvando...' : 'Salvar Projeto'}
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
