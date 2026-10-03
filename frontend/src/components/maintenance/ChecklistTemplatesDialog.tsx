import React, { useState, useEffect } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { checklistTemplateService } from '@/services/checklistTemplateService';
import type { ChecklistTemplate, ChecklistTemplateCreate, ChecklistTemplateUpdate } from '@/types/checklistTemplate';
import { Trash2, Plus, Edit2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'create' | 'edit';

export const ChecklistTemplatesDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { success, error: toastError } = useToast();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<ChecklistTemplateCreate & { is_active?: boolean }>({
    name: '',
    description: '',
    maintenance_type: 'preventiva',
    is_active: true,
    items: [],
  });
  const [newItemTitle, setNewItemTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setViewMode('list');
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await checklistTemplateService.getTemplates();
      setTemplates(data);
    } catch (err) {
      toastError('Erro', 'Falha ao carregar templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({ name: '', description: '', maintenance_type: 'preventiva', is_active: true, items: [] });
    setNewItemTitle('');
    setViewMode('create');
  };

  const handleOpenEdit = (tpl: ChecklistTemplate) => {
    setEditingId(tpl.id);
    setFormData({
      name: tpl.name,
      description: tpl.description || '',
      maintenance_type: tpl.maintenance_type,
      is_active: tpl.is_active,
      items: tpl.items.map(it => ({ title: it.title, position: it.position })),
    });
    setNewItemTitle('');
    setViewMode('edit');
  };

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;
    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), { title: newItemTitle, position: (prev.items || []).length }],
    }));
    setNewItemTitle('');
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => {
      const newItems = [...(prev.items || [])];
      newItems.splice(index, 1);
      return { ...prev, items: newItems.map((it, i) => ({ ...it, position: i })) };
    });
  };

  const handleSave = async () => {
    if (!formData.name) return toastError('Erro', 'Nome é obrigatório');
    try {
      if (viewMode === 'create') {
        await checklistTemplateService.createTemplate(formData as ChecklistTemplateCreate);
        success('Sucesso', 'Template criado com sucesso');
      } else if (viewMode === 'edit' && editingId) {
        await checklistTemplateService.updateTemplate(editingId, formData as ChecklistTemplateUpdate);
        success('Sucesso', 'Template atualizado com sucesso');
      }
      setViewMode('list');
      loadTemplates();
    } catch (err) {
      toastError('Erro', 'Falha ao salvar template');
    }
  };

  const confirm = useConfirm();

  const handleDelete = async (id: number) => {
    if (!(await confirm({ title: 'Excluir este modelo de checklist?' }))) return;
    try {
      await checklistTemplateService.deleteTemplate(id);
      success('Sucesso', 'Template excluído com sucesso');
      loadTemplates();
    } catch (err) {
      toastError('Erro', 'Falha ao excluir template. Pode haver dependências.');
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await checklistTemplateService.updateTemplate(id, { is_active: !currentActive });
      success('Sucesso', `Template ${!currentActive ? 'ativado' : 'inativado'} com sucesso`);
      loadTemplates();
    } catch (err) {
      toastError('Erro', 'Falha ao alterar status do template');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modelos de Checklist (Templates)</DialogTitle>
          <DialogDescription>Gerencie os templates de checklists operacionais.</DialogDescription>
        </DialogHeader>

        {viewMode === 'list' ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleOpenCreate} className="gap-2">
                <Plus size={16} /> Novo Template
              </Button>
            </div>
            
            {isLoading ? (
              <p>Carregando...</p>
            ) : templates.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum template encontrado.</p>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl) => (
                  <div key={tpl.id} className={`p-3 border rounded flex justify-between items-start ${!tpl.is_active ? 'opacity-60 bg-muted/20' : ''}`}>
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {tpl.name}
                        {!tpl.is_active && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Inativo</span>}
                      </h4>
                      <p className="text-sm text-muted-foreground">{tpl.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tpl.items.length} itens • {tpl.maintenance_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleActive(tpl.id, tpl.is_active)} title={tpl.is_active ? "Inativar" : "Ativar"}>
                        <Switch checked={tpl.is_active} disabled className="scale-75" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(tpl)}>
                        <Edit2 size={16} className="text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(tpl.id)}>
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Itens</label>
              <div className="flex gap-2">
                <Input value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddItem()} placeholder="Novo item..." />
                <Button onClick={handleAddItem} variant="outline">Adicionar</Button>
              </div>
              <div className="space-y-2 mt-2">
                {(formData.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-muted/30 p-2 rounded">
                    <span className="text-sm">{it.title}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(idx)}>
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setViewMode('list')}>Cancelar</Button>
              <Button onClick={handleSave}>{viewMode === 'create' ? 'Criar' : 'Salvar Alterações'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
