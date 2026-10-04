import { useContext } from 'react';
import { PromptContext, type PromptFn } from '../context/ConfirmContextDef';

const nativePrompt: PromptFn = async ({ title, defaultValue }) => window.prompt(title, defaultValue ?? '');

/** Pede um texto curto ao usuário no diálogo padrão: `const name = await prompt({ title, label })`. */
export const usePrompt = (): PromptFn => useContext(PromptContext) ?? nativePrompt;
