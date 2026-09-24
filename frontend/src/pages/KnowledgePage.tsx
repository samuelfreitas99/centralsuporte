import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Plus,
  Search,
  Star,
  Clock,
  Eye,
  Tag,
  History,
  Terminal,
} from 'lucide-react';
import type {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeArticleCreatePayload,
  KnowledgeArticleUpdatePayload,
} from '@/types/knowledge';
import { knowledgeService } from '@/services/knowledgeService';
import { ArticleFormDialog } from '@/components/knowledge/ArticleFormDialog';
import { ArticleViewDialog } from '@/components/knowledge/ArticleViewDialog';

export const KnowledgePage: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Dialogs
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [articleToEdit, setArticleToEdit] = useState<KnowledgeArticle | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catsData, artsData] = await Promise.all([
        knowledgeService.getCategories(),
        knowledgeService.getArticles({
          category_id: selectedCategory ? Number(selectedCategory) : undefined,
          search: searchTerm || undefined,
          only_favorites: onlyFavorites || undefined,
        }),
      ]);
      setCategories(catsData);
      setArticles(artsData);

      if (selectedArticle) {
        const updated = artsData.find((a) => a.id === selectedArticle.id);
        if (updated) setSelectedArticle(updated);
      }
    } catch (err) {
      console.error('Falha ao carregar artigos:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm, onlyFavorites, selectedArticle]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveArticle = async (payload: KnowledgeArticleCreatePayload | KnowledgeArticleUpdatePayload) => {
    if (articleToEdit) {
      await knowledgeService.updateArticle(articleToEdit.id, payload);
    } else {
      await knowledgeService.createArticle(payload as KnowledgeArticleCreatePayload);
    }
    loadData();
  };

  const handleOpenCreate = () => {
    setArticleToEdit(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (article: KnowledgeArticle) => {
    setArticleToEdit(article);
    setFormDialogOpen(true);
  };

  const handleOpenView = async (article: KnowledgeArticle) => {
    try {
      const detailed = await knowledgeService.getArticleById(article.id);
      setSelectedArticle(detailed);
      setViewDialogOpen(true);
      // update view counter in list
      setArticles((prev) =>
        prev.map((a) => (a.id === detailed.id ? { ...a, views_count: detailed.views_count } : a))
      );
    } catch (err) {
      console.error('Falha ao abrir detalhes do artigo:', err);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, articleId: number) => {
    e.stopPropagation();
    try {
      await knowledgeService.toggleFavorite(articleId);
      loadData();
    } catch (err) {
      console.error('Falha ao alternar favorito:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>Base de Conhecimento Técnico</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Procedimentos operacionais, manuais de infraestrutura, diagnósticos de suporte e biblioteca de soluções
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="flex items-center gap-1.5 h-9 shrink-0">
          <Plus className="h-4 w-4" />
          <span>Novo Artigo Técnico</span>
        </Button>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por título, sintomas, comandos ou palavras-chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
                className="h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground font-medium"
              >
                <option value="">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <Button
                variant={onlyFavorites ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className="h-9 text-xs flex items-center gap-1.5"
              >
                <Star className={`h-3.5 w-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
                <span>Favoritos</span>
              </Button>
            </div>

            <div className="text-xs font-semibold text-muted-foreground">
              {articles.length} artigo{articles.length !== 1 ? 's' : ''} encontrado{articles.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 border-t border-border">
          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Carregando artigos técnicos...</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
              <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-1" />
              <p className="font-semibold text-foreground">Nenhum artigo encontrado.</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Documente novos diagnósticos ou procedimentos técnicos para compartilhar conhecimento com a equipe.
              </p>
              <Button size="sm" variant="outline" onClick={handleOpenCreate} className="mt-2 text-xs">
                Criar Primeiro Artigo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {articles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => handleOpenView(article)}
                  className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {article.category && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/30 text-primary font-semibold">
                            {article.category.name}
                          </Badge>
                        )}
                        <Badge
                          variant={article.status === 'publicado' ? 'success' : 'warning'}
                          className="text-[10px] py-0 h-4 uppercase font-bold"
                        >
                          {article.status}
                        </Badge>
                      </div>

                      <button
                        onClick={(e) => handleToggleFavorite(e, article.id)}
                        className="p-1 text-muted-foreground hover:text-amber-500 transition-colors"
                        title={article.is_favorite ? 'Remover dos favoritos' : 'Favoritar artigo'}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            article.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/60'
                          }`}
                        />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                      {article.title}
                    </h3>

                    {article.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {article.summary}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <Tag className="h-3 w-3 text-muted-foreground/60" />
                        {article.tags.slice(0, 3).map((t) => (
                          <span key={t.id} className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-muted">
                            #{t.name}
                          </span>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{article.tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(article.updated_at).toLocaleDateString('pt-BR')}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {article.commands && (
                          <span className="flex items-center gap-1 text-primary font-mono text-[10px]" title="Contém comandos">
                            <Terminal className="h-3 w-3" />
                            <span>Comandos</span>
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{article.views_count}</span>
                        </span>

                        {article.versions && (
                          <span className="flex items-center gap-1 font-semibold text-primary">
                            <History className="h-3 w-3" />
                            <span>v{article.versions.length}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ArticleFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        articleToEdit={articleToEdit}
        categories={categories}
        onSave={handleSaveArticle}
      />

      <ArticleViewDialog
        article={selectedArticle}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onEdit={handleOpenEdit}
        onDeleted={loadData}
        onFavoriteToggled={loadData}
      />
    </div>
  );
};
