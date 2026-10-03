import React from 'react';
import type { CommandItem, CommandStep } from '@/types/commands';
import { AlertTriangle, Check, Copy, Edit2, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

/** Cartão de comando: passos em um bloco de código, cada linha copiável; "Copiar tudo" no rodapé. */
export const CommandCard: React.FC<CommandCardProps> = ({ cmd, copiedId, canModify, onCopy, onCopyStep, onEdit, onDelete }) => {
  const allCopied = copiedId === `cmd-${cmd.id}`;
  const steps = cmd.steps ?? [];
  const multiStep = steps.length > 1;

  return (
    <article className="flex h-full flex-col rounded-xl border border-border/70 bg-card transition-colors hover:border-primary/40">
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="default" className="font-mono text-[11px]">
            {cmd.system || 'Geral'}
          </Badge>
          {cmd.category && (
            <Badge variant="secondary" className="text-[11px]">
              {cmd.category}
            </Badge>
          )}
          {cmd.visibility === 'privado' && (
            <Badge variant="outline" className="flex items-center gap-1 border-amber-500/30 text-[10px] text-amber-500">
              <Lock className="h-3 w-3" />
              Privado
            </Badge>
          )}
        </div>

        <div>
          <h3 className="font-bold leading-snug text-foreground">{cmd.title}</h3>
          {cmd.description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{cmd.description}</p>}
        </div>

        {cmd.warning?.trim() && (
          <p className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span>
              <strong className="text-destructive">Atenção: </strong>
              {cmd.warning}
            </span>
          </p>
        )}

        <ol className="overflow-hidden rounded-lg border border-border/60 bg-slate-950 font-mono text-xs">
          {steps.map((step, index) => {
            const copied = multiStep ? copiedId === `cmd-${cmd.id}-step-${step.id}` : allCopied;
            return (
              <li key={step.id} className="border-b border-white/5 last:border-0">
                <button
                  type="button"
                  onClick={() => (multiStep ? onCopyStep(step) : onCopy())}
                  title={multiStep ? 'Copiar este passo' : 'Copiar comando'}
                  className="group flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-white/5 cursor-pointer"
                >
                  {multiStep && <span className="w-4 shrink-0 select-none text-slate-500">{index + 1}</span>}
                  <span className="min-w-0 flex-1">
                    {step.title && <span className="mb-0.5 block font-sans text-[11px] text-slate-400">{step.title}</span>}
                    <code className="block whitespace-pre-wrap break-all text-sky-300">{step.command_text}</code>
                  </span>
                  {copied ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Copiado" />
                  ) : (
                    <Copy className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-200" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 px-4 py-2.5">
        <span className="text-[11px] text-muted-foreground">
          {cmd.copies_count} {cmd.copies_count === 1 ? 'cópia' : 'cópias'}
        </span>
        <div className="flex items-center gap-1">
          {canModify && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label="Editar comando"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                aria-label="Excluir comando"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {multiStep && (
            <Button size="sm" variant={allCopied ? 'secondary' : 'outline'} onClick={onCopy} className={cn('ml-1 h-8 gap-1.5 text-xs')}>
              {allCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {allCopied ? 'Copiado' : 'Copiar tudo'}
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
};
