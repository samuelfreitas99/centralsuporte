import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Container } from '@/components/layout/Container';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthContext } from '@/context/AuthContextDef';
import { ThemeContext } from '@/context/ThemeContextDef';
import type { AuthContextType } from '@/types/auth';
import type { ThemeContextType } from '@/context/ThemeContextDef';

const mockLogout = vi.fn();
const mockToggleTheme = vi.fn();
const mockHasPermission = vi.fn();

const defaultAuth: AuthContextType = {
  user: {
    id: 1,
    username: 'admin',
    email: 'admin@centralsuporte.local',
    is_active: true,
    role: {
      id: 1,
      name: 'Administrador',
      permissions: [{ id: 1, name: 'users:read' }],
    },
  },
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: mockLogout,
  hasPermission: mockHasPermission,
  hasRole: vi.fn(),
};

const defaultTheme: ThemeContextType = {
  theme: 'dark',
  toggleTheme: mockToggleTheme,
};

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <ThemeContext.Provider value={defaultTheme}>
      <AuthContext.Provider value={defaultAuth}>{ui}</AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

describe('Layout Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    it('renders brand title, username, and role badge', () => {
      renderWithProviders(<Header />);

      expect(screen.getByText('Central de Suporte')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('Administrador')).toBeInTheDocument();
    });

    it('triggers toggleTheme when theme button is clicked', () => {
      renderWithProviders(<Header />);

      const themeBtn = screen.getByRole('button', { name: /alternar para tema/i });
      fireEvent.click(themeBtn);
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('triggers logout when Sair button is clicked', () => {
      renderWithProviders(<Header />);

      const logoutBtn = screen.getByRole('button', { name: /sair/i });
      fireEvent.click(logoutBtn);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sidebar', () => {
    it('renders navigation modules and OTRS disclaimer card', () => {
      mockHasPermission.mockReturnValue(true);
      const onSelectTab = vi.fn();

      renderWithProviders(
        <Sidebar currentTab="dashboard" onSelectTab={onSelectTab} isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Tarefas e Checklists')).toBeInTheDocument();
      expect(screen.getByText('Base de Conhecimento')).toBeInTheDocument();
      expect(screen.getByText('Chamados no OTRS')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Base de Conhecimento'));
      expect(onSelectTab).toHaveBeenCalledWith('knowledge');
    });

    it('hides Usuários e Perfis when user lacks permission', () => {
      mockHasPermission.mockReturnValue(false);

      renderWithProviders(
        <Sidebar currentTab="dashboard" onSelectTab={vi.fn()} isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.queryByText('Usuários e Perfis')).not.toBeInTheDocument();
    });
  });

  describe('Container', () => {
    it('renders children with responsive container classes', () => {
      render(
        <Container data-testid="test-container" size="narrow">
          <div>Conteúdo</div>
        </Container>
      );

      const container = screen.getByTestId('test-container');
      expect(container).toBeInTheDocument();
      expect(container.className).toContain('max-w-4xl');
      expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    });
  });

  describe('AppLayout', () => {
    it('renders Header, Sidebar, and child content', () => {
      mockHasPermission.mockReturnValue(true);

      renderWithProviders(
        <AppLayout currentTab="dashboard">
          <div data-testid="main-content">Página Principal</div>
        </AppLayout>
      );

      expect(screen.getByText('Central de Suporte')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });
  });
});
