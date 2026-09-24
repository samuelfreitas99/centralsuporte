import { request } from './api';
import type { GlobalSearchResponse, SearchEntityType } from '@/types/search';

export const searchService = {
  globalSearch: (params: {
    q: string;
    entity_type?: SearchEntityType;
    store_id?: number;
    limit?: number;
  }): Promise<GlobalSearchResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.append('q', params.q);
    if (params.entity_type) searchParams.append('entity_type', params.entity_type);
    if (params.store_id) searchParams.append('store_id', String(params.store_id));
    if (params.limit) searchParams.append('limit', String(params.limit));

    return request<GlobalSearchResponse>(`/search/global?${searchParams.toString()}`);
  },
};
