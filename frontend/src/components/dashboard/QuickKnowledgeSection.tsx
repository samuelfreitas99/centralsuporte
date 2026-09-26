import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Eye, ArrowRight, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { KnowledgeArticle } from '@/types/knowledge';

interface QuickKnowledgeSectionProps {
  articles: KnowledgeArticle[];
  loading?: boolean;
  onNavigateToKnowledge?: (id?: number) => void;
}

export const QuickKnowledgeSection: React.FC<QuickKnowledgeSectionProps> = ({ articles, loading, onNavigateToKnowledge }) => {
  return (
    <Card variant="default" className="h-full flex flex-col shadow-sm border-border/60">
      <CardHeader className="pb-4 px-4 pt-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="font-heading text-base font-bold">Base de Conhecimento</CardTitle>
          </div>
          {onNavigateToKnowledge && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToKnowledge?.()}
              className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer hover:bg-muted/50"
            >
              <span>Acessar base</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 py-3 flex-1 bg-card">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 mb-2 animate-spin opacity-40" />
            <p className="text-xs font-medium">Carregando...</p>
          </div>
        ) : articles.length > 0 ? (
          articles.map((article) => (
            <div
              key={article.id}
              className="flex items-center justify-between gap-3 rounded-md p-3 text-sm border border-border/40 bg-background hover:bg-muted/40 transition-colors shadow-xs group cursor-pointer"
              onClick={() => onNavigateToKnowledge?.(article.id)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[13px] text-foreground group-hover:text-primary transition-colors">
                  {article.title}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  {article.category && (
                    <Badge variant="outline" className="text-[9px] py-0 h-4 border-border/60">
                      {article.category.name}
                    </Badge>
                  )}
                  {article.tags?.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 rounded-sm">
                      #{tag.name}
                    </span>
                  ))}
                  {(article.tags?.length || 0) > 2 && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      +{(article.tags?.length || 0) - 2}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 text-muted-foreground text-[10px] font-medium bg-muted/40 px-2 py-1 rounded-md border border-border/50">
                <Eye className="h-3 w-3" />
                <span>0</span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <Info className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-xs font-medium">Nenhum artigo encontrado.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
