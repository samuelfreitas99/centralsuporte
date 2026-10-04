import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { ConfirmContext, PromptContext, type ConfirmOptions, type PromptOptions } from '@/context/ConfirmContextDef';

/** Provider global do diálogo de confirmação (usado via `useConfirm`). */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(opts);
      }),
    []
  );

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  const destructive = options?.destructive ?? true;

  const [promptOptions, setPromptOptions] = useState<PromptOptions | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const promptResolver = useRef<((value: string | null) => void) | null>(null);

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        promptResolver.current?.(null);
        promptResolver.current = resolve;
        setPromptValue(opts.defaultValue ?? '');
        setPromptOptions(opts);
      }),
    []
  );

  const closePrompt = (result: string | null) => {
    promptResolver.current?.(result);
    promptResolver.current = null;
    setPromptOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
     <PromptContext.Provider value={prompt}>
      {children}
      <Dialog open={options !== null} onOpenChange={(open) => !open && close(false)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {destructive && <AlertTriangle className="h-4 w-4 text-destructive" />}
              {options?.title}
            </DialogTitle>
            {options?.description && <DialogDescription>{options.description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => close(false)}>
              {options?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button variant={destructive ? 'destructive' : 'default'} onClick={() => close(true)} autoFocus>
              {options?.confirmLabel ?? (destructive ? 'Excluir' : 'Confirmar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={promptOptions !== null} onOpenChange={(open) => !open && closePrompt(null)}>
        <DialogContent size="sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (promptValue.trim()) closePrompt(promptValue.trim());
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>{promptOptions?.title}</DialogTitle>
              {promptOptions?.description && <DialogDescription>{promptOptions.description}</DialogDescription>}
            </DialogHeader>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">{promptOptions?.label}</span>
              <Input value={promptValue} onChange={(e) => setPromptValue(e.target.value)} placeholder={promptOptions?.placeholder} autoFocus />
            </label>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => closePrompt(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!promptValue.trim()}>
                {promptOptions?.confirmLabel ?? 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
     </PromptContext.Provider>
    </ConfirmContext.Provider>
  );
};
