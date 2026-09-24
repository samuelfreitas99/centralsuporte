import { request } from './api';
import type {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeTag,
  KnowledgeArticleCreatePayload,
  KnowledgeArticleUpdatePayload,
} from '../types/knowledge';

export const knowledgeService = {
  getCategories: async (): Promise<KnowledgeCategory[]> => {
    return request<KnowledgeCategory[]>('/knowledge/categories');
  },

  createCategory: async (payload: { name: string; description?: string; color?: string }): Promise<KnowledgeCategory> => {
    return request<KnowledgeCategory>('/knowledge/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getTags: async (): Promise<KnowledgeTag[]> => {
    return request<KnowledgeTag[]>('/knowledge/tags');
  },

  getArticles: async (params?: {
    category_id?: number;
    tag?: string;
    status?: string;
    search?: string;
    only_favorites?: boolean;
  }): Promise<KnowledgeArticle[]> => {
    const query = new URLSearchParams();
    if (params?.category_id) query.append('category_id', params.category_id.toString());
    if (params?.tag) query.append('tag', params.tag);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.only_favorites) query.append('only_favorites', 'true');

    const qs = query.toString();
    return request<KnowledgeArticle[]>(`/knowledge/articles${qs ? `?${qs}` : ''}`);
  },

  getArticleById: async (id: number): Promise<KnowledgeArticle> => {
    return request<KnowledgeArticle>(`/knowledge/articles/${id}`);
  },

  createArticle: async (payload: KnowledgeArticleCreatePayload): Promise<KnowledgeArticle> => {
    return request<KnowledgeArticle>('/knowledge/articles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateArticle: async (id: number, payload: KnowledgeArticleUpdatePayload): Promise<KnowledgeArticle> => {
    return request<KnowledgeArticle>(`/knowledge/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteArticle: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/knowledge/articles/${id}`, {
      method: 'DELETE',
    });
  },

  toggleFavorite: async (id: number): Promise<{ status: string; action: string; is_favorite: boolean }> => {
    return request<{ status: string; action: string; is_favorite: boolean }>(`/knowledge/articles/${id}/favorite`, {
      method: 'POST',
    });
  },
};
