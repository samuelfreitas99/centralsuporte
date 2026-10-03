import { useEffect, useRef } from 'react';

/**
 * Deep link padrão da Central: `#<modulo>?id=<n>` abre o item `n` no módulo.
 *
 * Usado pela busca global (Ctrl+K), pelo Início e por links entre telas.
 * A página chama `useDeepLinkId('modulo', abrirItem)`; o callback é chamado
 * na montagem e sempre que o hash mudar para esse módulo com um `id`.
 * Ao fechar o item, chame `clearDeepLinkId()` para que o link não reabra.
 */
export function useDeepLinkId(module: string, onOpen: (id: number) => void) {
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  });

  useEffect(() => {
    const check = () => {
      const id = readDeepLinkId(module);
      if (id) onOpenRef.current(id);
    };
    check();
    window.addEventListener('popstate', check);
    window.addEventListener('hashchange', check);
    return () => {
      window.removeEventListener('popstate', check);
      window.removeEventListener('hashchange', check);
    };
  }, [module]);
}

/** Lê o `id` do hash se ele pertencer ao módulo informado. */
export function readDeepLinkId(module: string): number | null {
  const [tab, query] = window.location.hash.replace('#', '').split('?');
  if (tab !== module) return null;
  const id = Number(new URLSearchParams(query || '').get('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Remove o `id` do hash sem disparar navegação (mantém os demais parâmetros). */
export function clearDeepLinkId() {
  const [tab, query] = window.location.hash.replace('#', '').split('?');
  const params = new URLSearchParams(query || '');
  if (!params.has('id')) return;
  params.delete('id');
  const rest = params.toString();
  window.history.replaceState(null, '', `#${tab}${rest ? `?${rest}` : ''}`);
}
