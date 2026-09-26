import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Eye, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { QuickKnowledge } from '@/types/dashboard';

interface QuickKnowledgeSectionProps {
  articles: QuickKnowledge[];
  onNavigateToKnowledge?: () => void;
}

export const QuickKnowledgeSection: React.FC<QuickKnowledgeSectionProps> = ({ articles, onNavigateToKnowledge }) => {
  return (
    <Card variant="ghost" className="h-full flex flex-col">
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="font-heading text-lg">Knowledge Base</CardTitle>
          </div>
          {onNavigateToKnowledge && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToKnowledge}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <span>Acessar</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-0 pb-0 flex-1">
        {articles.map((item) => (
          <div
            key={item.id}
            onClick={onNavigateToKnowledge}
            className="group flex flex-col gap-2 rounded-lg bg-card/40 p-3 text-sm transition-all duration-200 hover:bg-card/80 border border-transparent hover:border-primary/20 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-primary/80 uppercase tracking-wider">{item.category}</span>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Eye className="h-3 w-3" />
                <span>{item.views}</span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                {item.title}
              </p>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:translate-x-1 group-hover:text-primary transition-all mt-0.5" />
            </div>

            <div className="flex flex-wrap gap-1 pt-1">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-muted/40">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
