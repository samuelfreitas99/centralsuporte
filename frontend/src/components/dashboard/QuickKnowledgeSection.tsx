import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Eye, ArrowRight } from 'lucide-react';
import type { QuickKnowledge } from '@/types/dashboard';

interface QuickKnowledgeSectionProps {
  articles: QuickKnowledge[];
}

export const QuickKnowledgeSection: React.FC<QuickKnowledgeSectionProps> = ({ articles }) => {
  return (
    <Card className="h-full border-border/80 bg-card/75 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <BookOpen className="h-4 w-4" />
            </div>
            <CardTitle className="font-heading text-lg">Procedimentos Rápidos</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">Base de Conhecimento</span>
        </div>
        <CardDescription>
          Artigos técnicos e guias mais consultados no turno:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {articles.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col gap-2 rounded-xl border border-border/70 bg-card/90 p-3.5 text-sm transition-all duration-200 hover:border-blue-500/40 hover:bg-white/[0.03] hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400">{item.category}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                <span>{item.views}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground group-hover:text-blue-400 transition-colors">
                {item.title}
              </p>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-1 group-hover:text-blue-400 transition-all" />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="font-mono text-[10px] px-1.5 py-0 border-border/60">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
