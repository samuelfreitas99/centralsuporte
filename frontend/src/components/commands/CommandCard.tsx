import React from 'react';
import type { CommandItem, CommandStep } from '@/types/commands';
import { Copy, Check, AlertTriangle, Edit2, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface CommandCardProps {
  cmd: CommandItem;
  /** Id do último item copiado (`cmd-<id>` ou `cmd-<id>-step-<id>`), para o feedback "Copiado". */
  copiedId: string | null;
  canModify: boolean;
  onCopy: () => void;
  onCopyStep: (step: CommandStep) => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Cartão de comando com passos copiáveis um a um ou todos juntos. */
export const CommandCard: React.FC<CommandCardProps> = ({ cmd, copiedId, canModify, onCopy, onCopyStep, onEdit, onDelete }) => {
  const isCopied = copiedId === `cmd-${cmd.id}`;
  const hasWarning = Boolean(cmd.warning && cmd.warning.trim().length > 0);
  return (
    <Card className="h-full flex flex-col justify-between border-border/80 bg-card/75 hover:border-blue-500/40 hover:shadow-lg transition-all duration-200">
      <CardContent className="p-5 space-y-3.5">
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="default" className="text-[11px] font-mono">
              {cmd.system || 'Geral'}
            </Badge>
            {cmd.category && (
              <Badge variant="secondary" className="text-[11px]">
                {cmd.category}
              </Badge>
            )}
            {cmd.visibility === 'privado' && (
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Privado</span>
              </Badge>
            )}
          </div>

          {/* Copy counter */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
            <Copy className="h-3 w-3 text-blue-400" />
            <span>{cmd.copies_count} cópias</span>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight leading-snug">
            {cmd.title}
          </h3>
          {cmd.description && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {cmd.description}
            </p>
          )}
        </div>

        {/* Destructive / Operational Warning Callout */}
        {hasWarning && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Risco Operacional: Comando Destrutivo</span>
            </div>
            <div className="font-medium leading-relaxed opacity-90 text-foreground">
              {cmd.warning}
            </div>
          </div>
        )}

        {/* Steps Code blocks */}
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
          {cmd.steps?.map((step) => {
            const stepCopiedId = `cmd-${cmd.id}-step-${step.id}`;
            const isStepCopied = copiedId === stepCopiedId;
            return (
              <div key={step.id} className="relative group rounded-xl border border-border/80 bg-slate-950/80 p-3 overflow-hidden shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pb-1.5 mb-1.5 border-b border-white/[0.05]">
                  <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                    <span>Passo {step.position}: {step.title}</span>
                  </span>
                </div>
                {step.description && (
                  <p className="text-[11px] text-slate-400 mb-2">{step.description}</p>
                )}
                <div className="font-mono text-xs sm:text-sm text-blue-300 whitespace-pre-wrap break-all py-1 selection:bg-blue-600/40">
                  {step.command_text}
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <Button
                    size="sm"
                    variant={isStepCopied ? 'secondary' : 'default'}
                    onClick={() => onCopyStep(step)}
                    className="h-7 px-2 text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    {isStepCopied ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar Passo</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Copy All Action */}
        <div className="mt-3 flex items-center justify-between">
            {hasWarning ? (
              <span className="text-[10px] text-muted-foreground italic max-w-[60%]">
                Copiar não executa o comando. Use com cautela.
              </span>
            ) : (
              <span />
            )}
            <Button
              size="sm"
              variant={isCopied ? 'secondary' : 'default'}
              onClick={onCopy}
              className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm w-full sm:w-auto"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Procedimento Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Todos</span>
                </>
              )}
            </Button>
        </div>

        {/* Technical Notes / Guidelines */}
        {cmd.notes && (
          <div className="text-[11px] text-muted-foreground bg-muted/20 rounded-lg p-2.5 border border-border/40">
            <span className="font-semibold text-foreground mr-1">Observações:</span>
            {cmd.notes}
          </div>
        )}

        {/* Footer: Tags and Edit/Delete controls */}
        <div className="pt-2 flex items-center justify-between border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 flex-wrap">
            {cmd.tags &&
              cmd.tags.split(',').map((t, idx) => (
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
                aria-label="Editar comando"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                aria-label="Excluir comando"
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
