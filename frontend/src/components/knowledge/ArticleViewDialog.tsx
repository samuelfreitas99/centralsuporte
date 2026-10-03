import React, { useState } from 'react';
import { formatDateTime } from '@/lib/format';
import { useConfirm } from '@/hooks/useConfirm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Copy,
  Check,
  Star,
  Clock,
  Eye,
  User as UserIcon,
  Tag,
  Edit,
  Trash2,
  History,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  RotateCcw,
} from 'lucide-react';
import type { KnowledgeArticle } from '@/types/knowledge';
import { knowledgeService } from '@/services/knowledgeService';
import { AttachmentManager } from '@/components/attachments/AttachmentManager';
import { useAuth } from '@/hooks/useAuth';

interface ArticleViewDialogProps {
  article: KnowledgeArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (article: KnowledgeArticle) => void;
  onDeleted: () => void;
  onFavoriteToggled: () => void;
  onRestored?: () => void;
}

export const ArticleViewDialog: React.FC<ArticleViewDialogProps> = ({
  article,
  open,
  onOpenChange,
  onEdit,
  onDeleted,
  onFavoriteToggled,
  onRestored,
}) => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'content' | 'versions'>('content');
  const [copied, setCopied] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const confirm = useConfirm();

  if (!article) return null;

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!(await confirm({ title: `Restaurar a versão v${versionNumber}?`, description: 'Uma nova versão será criada com esse conteúdo; nada é perdido.', confirmLabel: 'Restaurar', destructive: false }))) return;
    try {
      await knowledgeService.restoreArticleVersion(article.id, versionNumber);
      if (onRestored) onRestored();
      onFavoriteToggled();
    } catch (err) {
      console.error('Falha ao restaurar versão:', err);
      alert('Erro ao restaurar versão.');
    }
  };

  const handleCopyCommands = () => {
    if (!article.commands) return;
    navigator.clipboard.writeText(article.commands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleFavorite = async () => {
    try {
      setFavLoading(true);
      await knowledgeService.toggleFavorite(article.id);
      onFavoriteToggled();
    } catch (err) {
      console.error('Falha ao favoritar:', err);
    } finally {
      setFavLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!(await confirm({ title: 'Excluir este artigo?', description: 'Ele sai da Base de Conhecimento.' }))) return;
    try {
      await knowledgeService.deleteArticle(article.id);
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      console.error('Falha ao excluir:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {article.category && (
                  <Badge variant="outline" className="font-semibold text-xs border-primary/40 bg-primary/5 text-primary">
                    {article.category.name}
                  </Badge>
                )}
                <Badge
                  variant={article.status === 'publicado' ? 'success' : article.status === 'rascunho' ? 'warning' : 'secondary'}
                  className="text-[10px] py-0 h-4 uppercase font-bold"
                >
                  {article.status}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold leading-snug">{article.title}</DialogTitle>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              disabled={favLoading}
              className="h-8 px-2 flex items-center gap-1.5 shrink-0"
              title={article.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Star
                className={`h-4 w-4 ${
                  article.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'
                }`}
              />
              <span className="text-xs">{article.is_favorite ? 'Favorito' : 'Favoritar'}</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <UserIcon className="h-3.5 w-3.5" />
              <span>Autor: {article.author?.username || 'Suporte'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Atualizado em: {formatDateTime(article.updated_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{article.views_count} visualizações</span>
            </div>
            {article.versions && (
              <div className="flex items-center gap-1 font-semibold text-primary">
                <History className="h-3.5 w-3.5" />
                <span>Versão v{article.versions.length}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Abas Internas: Artigo vs Histórico de Versões */}
        <div className="flex items-center gap-2 pt-2 border-b border-border">
          <button
            onClick={() => setActiveTab('content')}
            className={`pb-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'content'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Conteúdo do Artigo</span>
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`pb-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'versions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Histórico de Versões ({article.versions?.length || 1})</span>
          </button>
        </div>

        {activeTab === 'content' ? (
          <div className="space-y-4 py-2">
            {article.summary && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-foreground font-medium leading-relaxed">
                <span className="font-bold text-muted-foreground mr-1.5">Resumo:</span>
                {article.summary}
              </div>
            )}

            {/* Sintomas e Solução Estruturados */}
            {(article.problem || article.solution) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {article.problem && (
                  <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1">
                    <h5 className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Sintomas / Problema Observado</span>
                    </h5>
                    <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{article.problem}</p>
                  </div>
                )}

                {article.solution && (
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                    <h5 className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Solução / Diagnóstico</span>
                    </h5>
                    <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{article.solution}</p>
                  </div>
                )}
              </div>
            )}

            {/* Comandos com Copiar em 1 Clique */}
            {article.commands && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border">
                  <span className="text-xs font-mono font-bold flex items-center gap-1.5 text-foreground">
                    <Terminal className="h-3.5 w-3.5 text-primary" />
                    <span>Comandos Técnicos Relacionados</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs flex items-center gap-1 px-2"
                    onClick={handleCopyCommands}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-500 font-semibold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar Comandos</span>
                      </>
                    )}
                  </Button>
                </div>
                <pre className="p-3 text-xs font-mono bg-zinc-950 text-zinc-100 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {article.commands}
                </pre>
              </div>
            )}

            {/* Conteúdo Completo */}
            <div className="space-y-1.5 pt-1">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Documentação Completa</h5>
              <div className="p-3.5 rounded-lg border border-border bg-card text-xs text-foreground whitespace-pre-line leading-relaxed font-normal">
                {article.content}
              </div>
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                {article.tags.map((t) => (
                  <span key={t.id} className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    #{t.name}
                  </span>
                ))}
              </div>
            )}

            {/* Anexos */}
            <div className="pt-2">
              <AttachmentManager
                entityType="knowledge"
                entityId={article.id}
                readOnly={!hasPermission('knowledge:write')}
                compact
              />
            </div>
          </div>
        ) : (
          /* Histórico de Versões */
          <div className="space-y-3 py-3">
            {article.versions && article.versions.length > 0 ? (
              <div className="space-y-3">
                {article.versions.map((ver, idx) => (
                  <div key={ver.id} className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-bold text-xs bg-primary/10 text-primary border-primary/20">
                          Versão v{ver.version_number}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground">{ver.change_summary || 'Sem resumo'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {formatDateTime(ver.created_at)}
                        </span>
                        {idx > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreVersion(ver.version_number)}
                            className="h-6 text-[10px] px-2 flex items-center gap-1 text-primary hover:bg-primary/10"
                            title="Restaurar esta versão histórica"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            <span>Restaurar</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      <span>Editado por: {ver.editor?.username || 'Suporte'}</span>
                    </div>

                    <div className="mt-2 p-2 rounded bg-muted/40 border border-border/50 text-xs font-mono line-clamp-3 text-muted-foreground">
                      {ver.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Nenhum histórico anterior registrado para este artigo.
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs flex items-center gap-1.5"
              onClick={() => {
                onOpenChange(false);
                onEdit(article);
              }}
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Editar Artigo</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive flex items-center gap-1.5"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Excluir</span>
            </Button>
          </div>

          <Button variant="default" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
