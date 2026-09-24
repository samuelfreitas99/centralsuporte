import type { TokenResponse, User, Role } from '../types/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8088';

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Erro HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      // response wasn't JSON
    }

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    throw new Error(errorDetail);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string): Promise<TokenResponse> => {
    return request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getMe: (): Promise<User> => {
    return request<User>('/auth/me');
  },

  getRoles: (): Promise<Role[]> => {
    return request<Role[]>('/roles');
  },

  getUsers: (): Promise<User[]> => {
    return request<User[]>('/users');
  },
};
