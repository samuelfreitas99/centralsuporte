import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UsersPage } from '@/pages/UsersPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AuthContext } from '@/context/AuthContextDef';
import { ThemeContext } from '@/context/ThemeContextDef';
import { ToastProvider } from '@/components/ui/Toast';
import { userService } from '@/services/userService';
import { infrastructureService } from '@/services/infrastructureService';
import type { AuthContextType, User, UserProfileResponse, UserStatsResponse, Role } from '@/types/auth';
import type { DepartmentItem } from '@/types/infrastructure';

// Mock services
vi.mock('@/services/userService', () => ({
  userService: {
    getUsers: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getMyProfile: vi.fn(),
    updateMyProfile: vi.fn(),
    getUserProfile: vi.fn(),
    getUserStats: vi.fn(),
    getRoles: vi.fn(),
  },
}));

vi.mock('@/services/infrastructureService', () => ({
  infrastructureService: {
    getDepartments: vi.fn(),
  },
}));

const mockRoles: Role[] = [
  { id: 1, name: 'Administrador', permissions: [{ id: 1, name: 'users:read' }, { id: 2, name: 'users:write' }] },
  { id: 2, name: 'Técnico N1', permissions: [{ id: 3, name: 'attendances:read' }] },
];

const mockDepartments: DepartmentItem[] = [
  { id: 10, name: 'Suporte TI', created_at: '2026-01-01T00:00:00Z' },
  { id: 20, name: 'Infraestrutura', created_at: '2026-01-01T00:00:00Z' },
];

const mockUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@empresa.com.br',
    is_active: true,
    full_name: 'Administrador do Sistema',
    display_name: 'Admin Master',
    job_title: 'Coordenador de TI',
    department_id: 10,
    department: { id: 10, name: 'Suporte TI' },
    avatar_url: 'https://exemplo.com/avatar1.jpg',
    last_login_at: '2026-09-29T10:00:00Z',
    roles: [mockRoles[0]],
  },
  {
    id: 2,
    username: 'jsilva',
    email: 'jsilva@empresa.com.br',
    is_active: false,
    full_name: 'João da Silva',
    display_name: 'João Silva',
    job_title: 'Analista de Suporte N1',
    department_id: 10,
    department: { id: 10, name: 'Suporte TI' },
    avatar_url: null, // Test without avatar
    last_login_at: null,
    roles: [mockRoles[1]],
  },
  {
    id: 3,
    username: 'mferreira',
    email: 'mferreira@empresa.com.br',
    is_active: true,
    full_name: 'Maria Ferreira',
    display_name: 'Maria Ferreira',
    job_title: 'Especialista de Redes',
    department_id: 20,
    department: { id: 20, name: 'Infraestrutura' },
    avatar_url: null,
    last_login_at: '2026-09-28T14:30:00Z',
    roles: [mockRoles[1]],
  },
];

const mockMyProfile: UserProfileResponse = {
  id: 1,
  username: 'admin',
  full_name: 'Administrador do Sistema',
  display_name: 'Admin Master',
  avatar_url: 'https://exemplo.com/avatar.jpg',
  job_title: 'Coordenador de TI',
  department_id: 10,
  department: { id: 10, name: 'Suporte TI' },
  is_active: true,
  last_login_at: '2026-09-29T10:00:00Z',
  roles: [mockRoles[0]],
  email: 'admin@empresa.com.br',
  phone: '(11) 99999-1111',
  preferences: 'Tema escuro e notificações ativadas.',
};

const mockOtherMaskedProfile: UserProfileResponse = {
  id: 2,
  username: 'jsilva',
  full_name: 'João da Silva',
  display_name: 'João Silva',
  avatar_url: null, // No avatar
  job_title: 'Analista N1',
  department_id: 10,
  department: { id: 10, name: 'Suporte TI' },
  is_active: true,
  last_login_at: null,
  roles: [mockRoles[1]],
  email: null, // Masked private data
  phone: null, // Masked private data
  preferences: null, // Masked private data
};

const mockStats: UserStatsResponse = {
  user_id: 1,
  open_tasks: 4,
  resolved_attendances: 18,
  active_projects: 2,
  completed_maintenances: 7,
  authored_articles: 5,
};

const defaultAdminAuth: AuthContextType = {
  user: mockUsers[0],
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasPermission: vi.fn((perm: string) => ['users:read', 'users:write'].includes(perm)),
  hasRole: vi.fn((role: string) => role === 'Administrador'),
  refreshUser: vi.fn(),
};

const defaultTechAuth: AuthContextType = {
  user: mockUsers[1],
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasPermission: vi.fn((perm: string) => perm === 'users:read'), // read only, cannot write
  hasRole: vi.fn((role: string) => role === 'Técnico N1'),
  refreshUser: vi.fn(),
};

function renderWithProviders(ui: React.ReactNode, authValue = defaultAdminAuth) {
  return render(
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: vi.fn() }}>
      <AuthContext.Provider value={authValue}>
        <ToastProvider>{ui}</ToastProvider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

describe('Phase 11.3 — Users and Profiles Frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userService.getUsers).mockResolvedValue([...mockUsers]);
    vi.mocked(userService.getRoles).mockResolvedValue(mockRoles);
    vi.mocked(infrastructureService.getDepartments).mockResolvedValue(mockDepartments);
    vi.mocked(userService.getMyProfile).mockResolvedValue(mockMyProfile);
    vi.mocked(userService.getUserProfile).mockResolvedValue(mockMyProfile);
    vi.mocked(userService.getUserStats).mockResolvedValue(mockStats);
  });

  describe('UsersPage (Administração de Usuários)', () => {
    it('1. renders user list with names, avatars, jobs, departments, roles, and status', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Admin Master').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Maria Ferreira').length).toBeGreaterThanOrEqual(1);
      });

      // Role badges and departments
      expect(screen.getAllByText('Suporte TI').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Administrador').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Técnico N1').length).toBeGreaterThanOrEqual(1);

      // Status badges
      expect(screen.getAllByText('Ativo').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Inativo').length).toBeGreaterThanOrEqual(1);
    });

    it('2. filters user list by active and inactive status pills', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Admin Master').length).toBeGreaterThanOrEqual(1);
      });

      // Click "Inativos"
      const inativosBtn = screen.getByRole('button', { name: 'Inativos' });
      fireEvent.click(inativosBtn);

      expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('Admin Master').length).toBe(0);
      expect(screen.queryAllByText('Maria Ferreira').length).toBe(0);

      // Click "Ativos"
      const ativosBtn = screen.getByRole('button', { name: 'Ativos' });
      fireEvent.click(ativosBtn);

      expect(screen.getAllByText('Admin Master').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Maria Ferreira').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('João Silva').length).toBe(0);
    });

    it('3. searches users by query string (name, username, department)', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Admin Master').length).toBeGreaterThanOrEqual(1);
      });

      const searchInput = screen.getByPlaceholderText(/buscar por nome, login/i);
      fireEvent.change(searchInput, { target: { value: 'ferreira' } });

      expect(screen.getAllByText('Maria Ferreira').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('Admin Master').length).toBe(0);
      expect(screen.queryAllByText('João Silva').length).toBe(0);
    });

    it('4. displays empty state when search finds no results', async () => {
      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Admin Master').length).toBeGreaterThanOrEqual(1);
      });

      const searchInput = screen.getByPlaceholderText(/buscar por nome, login/i);
      fireEvent.change(searchInput, { target: { value: 'inexistente_xyz_123' } });

      expect(screen.getByText('Nenhum usuário corresponde aos filtros')).toBeInTheDocument();
    });

    it('5. displays error state and retry button when getUsers fails', async () => {
      vi.mocked(userService.getUsers).mockRejectedValueOnce(new Error('Erro de conexão com o backend'));

      renderWithProviders(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar usuários')).toBeInTheDocument();
        expect(screen.getByText('Erro de conexão com o backend')).toBeInTheDocument();
      });

      // Retry
      vi.mocked(userService.getUsers).mockResolvedValueOnce(mockUsers);
      const retryBtn = screen.getByRole('button', { name: /tentar novamente/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Admin Master').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('6. blocks visual write actions (Novo Usuário, Editar, Ativar/Desativar) when user lacks users:write permission', async () => {
      renderWithProviders(<UsersPage />, defaultTechAuth);

      await waitFor(() => {
        expect(screen.getAllByText('Admin Master').length).toBeGreaterThanOrEqual(1);
      });

      // "Novo Usuário" button should not exist
      expect(screen.queryByRole('button', { name: /novo usuário/i })).not.toBeInTheDocument();

      // Edit and status toggle buttons should not be present
      expect(screen.queryByTitle('Editar Cadastro')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Desativar usuário')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Ativar usuário')).not.toBeInTheDocument();
    });

    it('7. allows administrator to open drawer, edit user, and submit update', async () => {
      vi.mocked(userService.updateUser).mockResolvedValueOnce({
        ...mockUsers[1],
        job_title: 'Analista de Suporte N2',
        display_name: 'João Silva N2',
      });

      renderWithProviders(<UsersPage />, defaultAdminAuth);

      await waitFor(() => {
        expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1);
      });

      // Open Edit drawer for João Silva
      const editBtns = screen.getAllByTitle('Editar Cadastro');
      fireEvent.click(editBtns[1]); // second user (João Silva)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Editar Usuário' })).toBeInTheDocument();
      });

      // Change job title
      const jobInput = screen.getByLabelText(/cargo \/ função/i);
      fireEvent.change(jobInput, { target: { value: 'Analista de Suporte N2' } });

      const submitBtn = screen.getByRole('button', { name: /salvar alterações/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(userService.updateUser).toHaveBeenCalledWith(
          2,
          expect.objectContaining({
            job_title: 'Analista de Suporte N2',
          })
        );
      });
    });

    it('8. toggles active status and prevents self-deactivation', async () => {
      vi.mocked(userService.updateUser).mockResolvedValueOnce({
        ...mockUsers[1],
        is_active: true,
      });

      renderWithProviders(<UsersPage />, defaultAdminAuth);

      await waitFor(() => {
        expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1);
      });

      // The toggle button for the logged-in user (admin, index 0) should be disabled
      const allToggleBtns = screen.getAllByRole('button', { name: /alterar status/i });
      expect(allToggleBtns[0]).toBeDisabled();

      // The toggle button for João Silva (index 1) should be enabled and toggle status
      fireEvent.click(allToggleBtns[1]);

      await waitFor(() => {
        expect(userService.updateUser).toHaveBeenCalledWith(2, { is_active: true });
      });
    });

    it('9. navigates to user profile on click', async () => {
      const mockOpenProfile = vi.fn();
      renderWithProviders(<UsersPage onOpenProfile={mockOpenProfile} />);

      await waitFor(() => {
        expect(screen.getAllByText('Admin Master').length).toBeGreaterThanOrEqual(1);
      });

      const profileLinks = screen.getAllByTitle('Ver Perfil');
      fireEvent.click(profileLinks[0]);

      expect(mockOpenProfile).toHaveBeenCalledWith(1);
    });
  });

  describe('ProfilePage (Meu Perfil & Perfil de Terceiros)', () => {
    it('10. renders "Meu Perfil" with identity, private contact info, and operational stats', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Meu Perfil')).toBeInTheDocument();
        expect(screen.getByText('Admin Master')).toBeInTheDocument();
        expect(screen.getByText('admin@empresa.com.br')).toBeInTheDocument();
        expect(screen.getByText('(11) 99999-1111')).toBeInTheDocument();
      });

      // Operational statistics metrics
      expect(screen.getByText('4')).toBeInTheDocument(); // open tasks
      expect(screen.getByText('18')).toBeInTheDocument(); // resolved attendances
      expect(screen.getByText('2')).toBeInTheDocument(); // active projects
      expect(screen.getByText('7')).toBeInTheDocument(); // completed maintenances
      expect(screen.getByText('5')).toBeInTheDocument(); // authored articles
    });

    it('11. renders other user profile with private fields safely masked and avatar fallback initials', async () => {
      vi.mocked(userService.getUserProfile).mockResolvedValueOnce(mockOtherMaskedProfile);
      vi.mocked(userService.getUserStats).mockResolvedValueOnce({
        user_id: 2,
        open_tasks: 1,
        resolved_attendances: 5,
        active_projects: 0,
        completed_maintenances: 2,
        authored_articles: 0,
      });

      // User 3 (Maria) viewing User 2 (João Silva) -> isSelf = false
      const viewerAuth: AuthContextType = {
        ...defaultTechAuth,
        user: mockUsers[2], // id 3
        hasPermission: vi.fn(() => false),
      };

      renderWithProviders(<ProfilePage userId={2} />, viewerAuth);

      await waitFor(() => {
        expect(screen.getByText('Perfil de João Silva')).toBeInTheDocument();
        expect(screen.getByText('João Silva')).toBeInTheDocument();
      });

      // Verify privacy masking: Email is masked, showing "Informação restrita"
      expect(screen.getByText(/informação restrita/i)).toBeInTheDocument();
      expect(screen.queryByText('@empresa.com.br')).not.toBeInTheDocument();

      // Verify Avatar fallback initials ("JS" for João Silva)
      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('12. allows self-profile editing with only allowed payload fields via PUT /users/me/profile', async () => {
      vi.mocked(userService.updateMyProfile).mockResolvedValueOnce({
        ...mockMyProfile,
        display_name: 'Samuel Freitas',
        phone: '(11) 98888-2222',
      });

      const refreshMock = vi.fn().mockResolvedValue(undefined);
      const authWithRefresh: AuthContextType = {
        ...defaultAdminAuth,
        refreshUser: refreshMock,
      };

      renderWithProviders(<ProfilePage />, authWithRefresh);

      await waitFor(() => {
        expect(screen.getByText('Editar Meu Perfil')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Editar Meu Perfil'));

      await waitFor(() => {
        expect(screen.getByText('Personalize seu nome de exibição, foto de avatar e preferências de uso.')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/nome de exibição/i);
      fireEvent.change(nameInput, { target: { value: 'Samuel Freitas' } });

      const phoneInput = screen.getByLabelText(/telefone de contato \/ ramal/i);
      fireEvent.change(phoneInput, { target: { value: '(11) 98888-2222' } });

      const saveBtn = screen.getByRole('button', { name: /salvar perfil/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(userService.updateMyProfile).toHaveBeenCalledWith({
          display_name: 'Samuel Freitas',
          avatar_url: 'https://exemplo.com/avatar.jpg',
          phone: '(11) 98888-2222',
          preferences: 'Tema escuro e notificações ativadas.',
        });
        expect(refreshMock).toHaveBeenCalled();
      });
    });
  });
});
