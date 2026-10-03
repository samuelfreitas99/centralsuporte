import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
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
  FolderTree,
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
import { CategoryManagementDialog } from '@/components/knowledge/CategoryManagementDialog';
import { useDeepLinkId, clearDeepLinkId } from '@/hooks/useDeepLink';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE = 24;

export const KnowledgePage: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
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
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  // Volta para a página 1 sempre que um filtro muda.
  const filterKey = `${selectedCategory}|${searchTerm}|${onlyFavorites}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catsData, artsData] = await Promise.all([
        knowledgeService.getCategories(),
        knowledgeService.getArticles({
          category_id: selectedCategory ? Number(selectedCategory) : undefined,
          search: searchTerm || undefined,
          only_favorites: onlyFavorites || undefined,
          page,
          limit: PAGE_SIZE,
        }),
      ]);
      setCategories(catsData);
      setArticles(artsData.items);
      setTotalPages(artsData.total_pages);
      setTotalArticles(artsData.total);
    } catch (err) {
      console.error('Falha ao carregar artigos:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm, onlyFavorites, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // #knowledge?id=N: abre o artigo (busca global, Início, atendimento convertido)
  useDeepLinkId('knowledge', async (id) => {
    try {
      const detailed = await knowledgeService.getArticleById(id);
      setSelectedArticle(detailed);
      setViewDialogOpen(true);
      setArticles((prev) =>
        prev.map((a) => (a.id === detailed.id ? { ...a, views_count: detailed.views_count } : a))
      );
    } catch {
      clearDeepLinkId();
    }
  });



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

  // A lista não traz o conteúdo: a edição sempre parte do artigo completo.
  const handleOpenEdit = async (article: KnowledgeArticle) => {
    try {
      setArticleToEdit(await knowledgeService.getArticleById(article.id));
      setFormDialogOpen(true);
    } catch (err) {
      console.error('Falha ao carregar artigo para edição:', err);
    }
  };

  const handleOpenView = async (article: KnowledgeArticle) => {
    try {
      const detailed = await knowledgeService.getArticleById(article.id);
      setSelectedArticle(detailed);
      setViewDialogOpen(true);
      window.history.pushState(null, '', `#knowledge?id=${article.id}`);
      
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
    // Optimistic toggle
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, is_favorite: !a.is_favorite } : a))
    );
    if (selectedArticle && selectedArticle.id === articleId) {
      setSelectedArticle({
        ...selectedArticle,
        is_favorite: !selectedArticle.is_favorite,
      });
    }

    try {
      await knowledgeService.toggleFavorite(articleId);
      if (onlyFavorites) {
        loadData();
      }
    } catch (err) {
      console.error('Falha ao alternar favorito:', err);
      loadData();
    }
  };

  const totalFavorites = articles.filter((a) => a.is_favorite).length;

  return (
    <div className="space-y-6">
      <PageHeader icon={BookOpen} title="Base de Conhecimento" description="Procedimentos e soluções documentadas pela equipe.">
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => setCategoryDialogOpen(true)}
            className="flex items-center gap-1.5 h-9 text-xs"
          >
            <FolderTree className="h-4 w-4 text-primary" />
            <span>Gerenciar Categorias</span>
          </Button>

          <Button onClick={handleOpenCreate} className="flex items-center gap-1.5 h-9 text-xs">
            <Plus className="h-4 w-4" />
            <span>Novo Artigo Técnico</span>
          </Button>
        </div>
      </PageHeader>

      {/* Barra de Filtros e Busca */}
      <Card>
        <CardHeader className="p-4 pb-3 space-y-3">
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
                onChange={(e) => {
                  setSelectedCategory(e.target.value ? Number(e.target.value) : '');
                  setOnlyFavorites(false);
                }}
                className="h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground font-medium"
              >
                <option value="">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.articles_count !== undefined ? `(${c.articles_count})` : ''}
                  </option>
                ))}
              </select>

              <Button
                variant={onlyFavorites ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setOnlyFavorites(!onlyFavorites);
                  if (!onlyFavorites) setSelectedCategory('');
                }}
                className="h-9 text-xs flex items-center gap-1.5"
              >
                <Star className={`h-3.5 w-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
                <span>Favoritos</span>
                {totalFavorites > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-bold">
                    {totalFavorites}
                  </span>
                )}
              </Button>
            </div>

            <div className="text-xs font-semibold text-muted-foreground">
              {totalArticles} artigo{totalArticles !== 1 ? 's' : ''} encontrado{totalArticles !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Category Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              onClick={() => {
                setSelectedCategory('');
                setOnlyFavorites(false);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === '' && !onlyFavorites
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Todas ({categories.reduce((acc, c) => acc + (c.articles_count || 0), 0) || totalArticles})
            </button>

            <button
              onClick={() => {
                setOnlyFavorites(!onlyFavorites);
                if (!onlyFavorites) setSelectedCategory('');
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                onlyFavorites
                  ? 'bg-amber-500 text-white font-semibold shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Star className={`h-3 w-3 ${onlyFavorites ? 'fill-current' : ''}`} />
              <span>Favoritos</span>
            </button>

            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCategory(selectedCategory === c.id ? '' : c.id);
                  setOnlyFavorites(false);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                  selectedCategory === c.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: c.color || '#3b82f6' }}
                />
                <span>{c.name}</span>
                {c.articles_count !== undefined && (
                  <span className="opacity-75 text-[10px]">({c.articles_count})</span>
                )}
              </button>
            ))}
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
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 h-4 border-primary/30 font-semibold"
                            style={{ color: article.category.color || '#3b82f6' }}
                          >
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
                        {article.has_commands && (
                          <span className="flex items-center gap-1 text-primary font-mono text-[10px]" title="Contém comandos">
                            <Terminal className="h-3 w-3" />
                            <span>Comandos</span>
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{article.views_count}</span>
                        </span>

                        {Boolean(article.versions_count) && (
                          <span className="flex items-center gap-1 font-semibold text-primary">
                            <History className="h-3 w-3" />
                            <span>v{article.versions_count}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="pt-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
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
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) clearDeepLinkId();
        }}
        onEdit={handleOpenEdit}
        onDeleted={loadData}
        onFavoriteToggled={loadData}
      />

      <CategoryManagementDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        categories={categories}
        onCategoriesChanged={loadData}
      />
    </div>
  );
};
