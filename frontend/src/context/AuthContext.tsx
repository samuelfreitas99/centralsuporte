import React, { useState, useEffect, useCallback } from 'react';
import { cancelPushSubscription } from '@/lib/notifications';
import type { User } from '../types/auth';
import { api } from '../services/api';
import { AuthContext } from './AuthContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    const clear = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    };
    // Cancela o Web Push deste navegador antes de apagar o token (PCs compartilhados).
    cancelPushSubscription().finally(clear);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      // ignore
    }
  }, []);

  // Validate session on load
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const userData = await api.getMe();
        if (isMounted) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch {
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(username, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = useCallback((permissionName: string): boolean => {
    if (!user) return false;
    // Administrador role bypass
    if (user.role?.name === 'Administrador' || user.roles?.some((r) => r.name === 'Administrador')) {
      return true;
    }
    // Check primary role
    if (user.role?.permissions?.some((p) => p.name === permissionName)) {
      return true;
    }
    // Check multi-roles list
    if (user.roles?.some((r) => r.permissions?.some((p) => p.name === permissionName))) {
      return true;
    }
    return false;
  }, [user]);

  const hasRole = useCallback((roleName: string): boolean => {
    if (!user) return false;
    if (user.role?.name === 'Administrador' || user.roles?.some((r) => r.name === 'Administrador')) {
      return true;
    }
    if (user.role?.name === roleName) {
      return true;
    }
    if (user.roles?.some((r) => r.name === roleName)) {
      return true;
    }
    return false;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
