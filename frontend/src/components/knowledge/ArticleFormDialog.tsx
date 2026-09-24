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
import type {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeArticleCreatePayload,
  KnowledgeArticleUpdatePayload,
} from '@/types/knowledge';

interface ArticleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleToEdit?: KnowledgeArticle | null;
  categories: KnowledgeCategory[];
  onSave: (payload: KnowledgeArticleCreatePayload | KnowledgeArticleUpdatePayload) => Promise<void>;
}

export const ArticleFormDialog: React.FC<ArticleFormDialogProps> = ({
  open,
  onOpenChange,
  articleToEdit,
  categories,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [commands, setCommands] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [status, setStatus] = useState('publicado');
  const [visibility, setVisibility] = useState('equipe');
  const [tagsInput, setTagsInput] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (articleToEdit) {
      setTitle(articleToEdit.title);
      setSummary(articleToEdit.summary || '');
      setContent(articleToEdit.content);
      setProblem(articleToEdit.problem || '');
      setSolution(articleToEdit.solution || '');
      setCommands(articleToEdit.commands || '');
      setCategoryId(articleToEdit.category_id || '');
      setStatus(articleToEdit.status);
      setVisibility(articleToEdit.visibility);
      setTagsInput(articleToEdit.tags?.map((t) => t.name).join(', ') || '');
      setChangeSummary('');
    } else {
      setTitle('');
      setSummary('');
      setContent('');
      setProblem('');
      setSolution('');
      setCommands('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setStatus('publicado');
      setVisibility('equipe');
      setTagsInput('');
      setChangeSummary('');
    }
    setError(null);
  }, [articleToEdit, categories, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('O título e o conteúdo do artigo são obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tagNames = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const payload: KnowledgeArticleCreatePayload = {
        title: title.trim(),
        summary: summary.trim() || undefined,
        content: content.trim(),
        problem: problem.trim() || undefined,
        solution: solution.trim() || undefined,
        commands: commands.trim() || undefined,
        category_id: categoryId ? Number(categoryId) : null,
        status,
        visibility,
        tag_names: tagNames,
      };

      if (articleToEdit && changeSummary.trim()) {
        (payload as KnowledgeArticleUpdatePayload).change_summary = changeSummary.trim();
      }

      await onSave(payload);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar o artigo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{articleToEdit ? 'Editar Artigo de Conhecimento' : 'Novo Artigo Técnico'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Título do Artigo <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Resolução de Queda de Link e Roteamento de Backup"
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Categoria</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                disabled={loading}
              >
                <option value="">Geral / Sem Categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Status</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
              >
                <option value="publicado">Publicado (Visível)</option>
                <option value="rascunho">Rascunho (Interno)</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tags (separadas por vírgula)</label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex: rede, cisco, vlan, fibra"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Resumo Executivo</label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Breve resumo da finalidade ou síntese do procedimento..."
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Sintomas / Problema</label>
              <textarea
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Como o problema se manifesta, mensagens de erro observadas..."
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Solução Recomendada</label>
              <textarea
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="Causa raiz e procedimento de correção rápida..."
                disabled={loading}
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Comandos Técnicos / Snippets</label>
            <textarea
              className="font-mono text-xs flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={commands}
              onChange={(e) => setCommands(e.target.value)}
              placeholder="Ex: ping 10.0.0.1\nshow ip route\nservice network restart"
              disabled={loading}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Conteúdo Detalhado / Documentação Completa <span className="text-destructive">*</span>
            </label>
            <textarea
              className="flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva todo o procedimento, observações detalhadas e instruções passo a passo..."
              required
              disabled={loading}
              rows={5}
            />
          </div>

          {articleToEdit && (
            <div className="space-y-1.5 rounded-lg border border-border/80 bg-muted/30 p-3">
              <label className="text-xs font-bold text-foreground">
                Resumo da Alteração <span className="text-muted-foreground font-normal">(Registrado no histórico de versão)</span>
              </label>
              <Input
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Ex: Atualizado comandos de rede e adicionado caso de exceção"
                disabled={loading}
              />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : articleToEdit ? 'Salvar Nova Versão' : 'Publicar Artigo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
