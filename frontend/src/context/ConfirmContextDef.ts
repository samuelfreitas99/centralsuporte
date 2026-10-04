import { createContext } from 'react';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva (excluir, arquivar): botão vermelho. Padrão: true. */
  destructive?: boolean;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export interface PromptOptions {
  title: string;
  description?: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
}

/** Resolve com o texto digitado, ou `null` se cancelado. */
export type PromptFn = (options: PromptOptions) => Promise<string | null>;

export const PromptContext = createContext<PromptFn | undefined>(undefined);
