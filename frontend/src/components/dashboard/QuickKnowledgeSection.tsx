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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle>Procedimentos Rápidos</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">Base de Conhecimento</span>
        </div>
        <CardDescription>
          Artigos técnicos e comandos rápidos mais consultados no turno:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {articles.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent/30 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">{item.category}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                <span>{item.views}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                {item.title}
              </p>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="font-mono text-[10px] px-1.5 py-0">
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
