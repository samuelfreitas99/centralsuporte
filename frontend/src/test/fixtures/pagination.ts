import type { PaginatedResponse } from '@/types/pagination';

/** Embrulha itens no formato de resposta paginada da API (página única). */
export const pageOf = <T,>(items: T[]): PaginatedResponse<T> => ({
  items,
  page: 1,
  limit: Math.max(items.length, 1),
  total: items.length,
  total_pages: 1,
  has_next: false,
  has_prev: false,
});
