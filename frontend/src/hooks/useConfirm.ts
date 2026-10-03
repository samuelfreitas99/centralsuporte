import { useContext } from 'react';
import { ConfirmContext, type ConfirmFn } from '../context/ConfirmContextDef';

/** Fallback sem provider (ex.: componente testado isoladamente): diálogo nativo do navegador. */
const nativeConfirm: ConfirmFn = async ({ title, description }) =>
  window.confirm(description ? `${title}\n\n${description}` : title);

/**
 * Confirmação padrão da Central: `if (!(await confirm({ title: 'Excluir tarefa?' }))) return;`
 * Use sempre este hook em vez de `window.confirm`.
 */
export const useConfirm = (): ConfirmFn => useContext(ConfirmContext) ?? nativeConfirm;
