import { useState, useEffect, useCallback } from 'react';

export function usePagination(defaultLimit: number = 50) {
  // Parse initial state from hash URL
  const parseParams = () => {
    if (typeof window === 'undefined') return { page: 1, limit: defaultLimit };
    const hash = window.location.hash;
    const queryString = hash.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    
    const page = parseInt(params.get('page') || '1', 10) || 1;
    const limit = parseInt(params.get('limit') || String(defaultLimit), 10) || defaultLimit;
    
    return { page, limit };
  };

  const [pagination, setPaginationState] = useState(parseParams());

  useEffect(() => {
    const handleHashChange = () => {
      setPaginationState(parseParams());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const updateHashParams = useCallback((updates: Record<string, string | null>) => {
    const hash = window.location.hash;
    const [pathPart, queryPart] = hash.split('?');
    const params = new URLSearchParams(queryPart || '');

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const newQueryString = params.toString();
    const newHash = newQueryString ? `${pathPart}?${newQueryString}` : pathPart;
    
    window.location.hash = newHash;
    // We don't manually set state here because hashchange event will trigger it.
  }, []);

  const setPage = useCallback((newPage: number) => {
    if (newPage > 1) {
      updateHashParams({ page: String(newPage) });
    } else {
      updateHashParams({ page: null });
    }
  }, [updateHashParams]);

  const setLimit = useCallback((newLimit: number) => {
    updateHashParams({ 
      limit: String(newLimit),
      page: null // Reset to page 1
    });
  }, [updateHashParams]);

  const resetPage = useCallback(() => {
    updateHashParams({ page: null });
  }, [updateHashParams]);

  return {
    page: pagination.page,
    limit: pagination.limit,
    setPage,
    setLimit,
    resetPage,
    updateHashParams,
  };
}
