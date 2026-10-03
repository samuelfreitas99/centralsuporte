import React from 'react';
import type { StandardResponseItem } from '@/types/commands';
import { Copy, Check, Edit2, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const getAudienceLabel = (audience: string) => {
  switch (audience) {
    case 'usuario_final':
      return { label: 'Usuário Final', variant: 'success' as const };
    case 'tecnico':
      return { label: 'Equipe Técnica', variant: 'default' as const };
    case 'fornecedor':
      return { label: 'Fornecedor', variant: 'info' as const };
    default:
      return { label: audience, variant: 'secondary' as const };
  }
};

interface ResponseCardProps {
  resp: StandardResponseItem;
  copiedId: string | null;
  canModify: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Cartão de resposta padrão com cópia em um clique. */
export const ResponseCard: React.FC<ResponseCardProps> = ({ resp, copiedId, canModify, onCopy, onEdit, onDelete }) => {
  const isCopied = copiedId === `resp-${resp.id}`;
  const audienceInfo = getAudienceLabel(resp.audience);
  return (
    <Card className="h-full flex flex-col justify-between border-border/80 bg-card/75 hover:border-blue-500/40 hover:shadow-lg transition-all duration-200">
      <CardContent className="p-5 space-y-3.5">
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={audienceInfo.variant} className="text-[11px]">
              {audienceInfo.label}
            </Badge>
            {resp.category && (
              <Badge variant="secondary" className="text-[11px]">
                {resp.category}
              </Badge>
            )}
            {resp.visibility === 'privado' && (
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Privado</span>
              </Badge>
            )}
          </div>

          {/* Copy counter */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
            <Copy className="h-3 w-3 text-blue-400" />
            <span>{resp.copies_count} cópias</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-foreground tracking-tight leading-snug">
          {resp.title}
        </h3>

        {/* Content Preview Box */}
        <div className="relative rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2">
          <div className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed font-sans max-h-48 overflow-y-auto selection:bg-blue-600/30 pr-1">
            {resp.content}
          </div>

          {/* Copy Action */}
          <div className="pt-2 flex items-center justify-end border-t border-border/40">
            <Button
              size="sm"
              variant={isCopied ? 'secondary' : 'default'}
              onClick={onCopy}
              className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Resposta</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Footer: Tags and Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 flex-wrap">
            {resp.tags &&
              resp.tags.split(',').map((t, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground"
                >
                  #{t.trim()}
                </span>
              ))}
          </div>

          {canModify && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Editar resposta"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                aria-label="Excluir resposta"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
