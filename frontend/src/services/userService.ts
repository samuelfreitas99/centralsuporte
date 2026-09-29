import { request } from './api';
import type {
  User,
  Role,
  UserProfileResponse,
  UserStatsResponse,
  UserCreatePayload,
  UserUpdatePayload,
  UserProfileSelfUpdate,
} from '../types/auth';

export const userService = {
  getUsers: async (params?: {
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<User[]> => {
    const searchParams = new URLSearchParams();
    if (params?.is_active !== undefined) {
      searchParams.set('is_active', String(params.is_active));
    }
    if (params?.skip !== undefined) {
      searchParams.set('skip', String(params.skip));
    }
    if (params?.limit !== undefined) {
      searchParams.set('limit', String(params.limit));
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<User[]>(`/users${query}`);
  },

  getUser: async (id: number): Promise<User> => {
    return request<User>(`/users/${id}`);
  },

  createUser: async (payload: UserCreatePayload): Promise<User> => {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateUser: async (id: number, payload: UserUpdatePayload): Promise<User> => {
    return request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteUser: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  getMyProfile: async (): Promise<UserProfileResponse> => {
    return request<UserProfileResponse>('/users/me/profile');
  },

  updateMyProfile: async (payload: UserProfileSelfUpdate): Promise<UserProfileResponse> => {
    return request<UserProfileResponse>('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getUserProfile: async (id: number): Promise<UserProfileResponse> => {
    return request<UserProfileResponse>(`/users/${id}/profile`);
  },

  getUserStats: async (id: number): Promise<UserStatsResponse> => {
    return request<UserStatsResponse>(`/users/${id}/stats`);
  },

  getRoles: async (): Promise<Role[]> => {
    return request<Role[]>('/roles');
  },
};
