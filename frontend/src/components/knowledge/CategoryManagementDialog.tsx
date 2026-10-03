import React, { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type { KnowledgeCategory } from '@/types/knowledge';
import { knowledgeService } from '@/services/knowledgeService';

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: KnowledgeCategory[];
  onCategoriesChanged: () => void;
}

const PRESET_COLORS = [
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Esmeralda', value: '#10b981' },
  { label: 'Índigo', value: '#6366f1' },
  { label: 'Âmbar', value: '#f59e0b' },
  { label: 'Vermelho', value: '#ef4444' },
  { label: 'Roxo', value: '#8b5cf6' },
  { label: 'Ciano', value: '#06b6d4' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Ardósia', value: '#64748b' },
];

export const CategoryManagementDialog: React.FC<CategoryManagementDialogProps> = ({
  open,
  onOpenChange,
  categories,
  onCategoriesChanged,
}) => {
  const [editingCategory, setEditingCategory] = useState<KnowledgeCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setColor('#3b82f6');
    setError(null);
  };

  const handleStartEdit = (category: KnowledgeCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || '');
    setColor(category.color || '#3b82f6');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da categoria é obrigatório.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      if (editingCategory) {
        await knowledgeService.updateCategory(editingCategory.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        });
      } else {
        await knowledgeService.createCategory({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        });
      }
      resetForm();
      onCategoriesChanged();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar categoria. Verifique se o nome já existe.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirm = useConfirm();

  const handleDelete = async (category: KnowledgeCategory) => {
    const warning = (category.articles_count && category.articles_count > 0)
      ? `${category.articles_count} artigo(s) continuarão na base, mas ficarão sem categoria.`
      : undefined;

    if (!(await confirm({ title: `Excluir a categoria "${category.name}"?`, description: warning }))) return;

    try {
      await knowledgeService.deleteCategory(category.id);
      if (editingCategory?.id === category.id) {
        resetForm();
      }
      onCategoriesChanged();
    } catch (err: any) {
      alert(err?.message || 'Falha ao remover categoria');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FolderTree className="h-5 w-5 text-primary" />
            <span>Gerenciar Categorias da Base de Conhecimento</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Crie, renomeie ou organize as categorias temáticas para classificar procedimentos e diagnósticos.
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Formulário de Criação / Edição */}
          <Card className="border border-border/80 bg-muted/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  {editingCategory ? <Edit2 className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3.5 w-3.5 text-primary" />}
                  {editingCategory ? `Editar Categoria: ${editingCategory.name}` : 'Criar Nova Categoria'}
                </span>
                {editingCategory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar Edição
                  </Button>
                )}
              </div>

              {error && (
                <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Nome da Categoria *</label>
                    <Input
                      placeholder="Ex: Servidores Linux, Redes, pfSense"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Descrição Breve</label>
                    <Input
                      placeholder="Ex: Procedimentos de infraestrutura e roteamento"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Cores Pré-definidas */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Cor de Destaque</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setColor(preset.value)}
                        className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                          color === preset.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: preset.value }}
                        title={preset.label}
                      >
                        {color === preset.value && <Check className="h-3 w-3 text-white" />}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-6 w-7 rounded cursor-pointer border border-input bg-background p-0"
                        title="Cor personalizada"
                      />
                      <span className="text-[11px] font-mono text-muted-foreground">{color}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" disabled={submitting} className="h-8 text-xs font-medium">
                    {submitting ? 'Salvando...' : editingCategory ? 'Atualizar Categoria' : 'Adicionar Categoria'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Categorias Existentes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Categorias Cadastradas ({categories.length})</span>
            </div>

            {categories.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                Nenhuma categoria cadastrada até o momento.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3.5 w-3.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: cat.color || '#3b82f6' }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{cat.name}</span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] py-0 h-4 flex items-center gap-1 font-normal text-muted-foreground"
                          >
                            <FileText className="h-2.5 w-2.5" />
                            <span>{cat.articles_count ?? 0} artigo{(cat.articles_count ?? 0) !== 1 ? 's' : ''}</span>
                          </Badge>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(cat)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="Editar Categoria"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cat)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        title="Excluir Categoria"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
