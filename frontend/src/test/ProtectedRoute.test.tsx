import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthContext } from '../context/AuthContextDef';
import type { AuthContextType } from '../types/auth';

const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockHasPermission = vi.fn();
const mockHasRole = vi.fn();

const defaultContext: AuthContextType = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: mockLogin,
  logout: mockLogout,
  hasPermission: mockHasPermission,
  hasRole: mockHasRole,
};

function renderProtected(ui: React.ReactNode, contextOverride?: Partial<AuthContextType>) {
  return render(
    <AuthContext.Provider value={{ ...defaultContext, ...contextOverride }}>
      {ui}
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when isLoading is true', () => {
    renderProtected(
      <ProtectedRoute>
        <div>Conteúdo Protegido</div>
      </ProtectedRoute>,
      { isLoading: true }
    );

    expect(screen.getByText('Validando sessão...')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
  });

  it('renders LoginPage when user is not authenticated', () => {
    renderProtected(
      <ProtectedRoute>
        <div>Conteúdo Protegido</div>
      </ProtectedRoute>,
      { isAuthenticated: false }
    );

    expect(screen.getByText('Central de Suporte')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
  });

  it('renders protected children when authenticated', () => {
    renderProtected(
      <ProtectedRoute>
        <div>Conteúdo Protegido</div>
      </ProtectedRoute>,
      { isAuthenticated: true, user: { id: 1, username: 'admin', email: 'admin@local', is_active: true } }
    );

    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument();
  });

  it('blocks access when user lacks required permission', () => {
    mockHasPermission.mockReturnValue(false);

    renderProtected(
      <ProtectedRoute requiredPermission="users:write">
        <div>Área de Admin</div>
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        user: { id: 2, username: 'tecnico', email: 'tecnico@local', is_active: true },
        hasPermission: mockHasPermission,
      }
    );

    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    expect(screen.getByText(/permissão necessária \(users:write\)/i)).toBeInTheDocument();
    expect(screen.queryByText('Área de Admin')).not.toBeInTheDocument();
  });
});
