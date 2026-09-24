import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardPage } from '@/pages/DashboardPage';
import { AuthContext } from '@/context/AuthContextDef';
import { ThemeContext } from '@/context/ThemeContextDef';
import type { AuthContextType } from '@/types/auth';
import type { ThemeContextType } from '@/context/ThemeContextDef';

const defaultAuth: AuthContextType = {
  user: {
    id: 1,
    username: 'admin',
    email: 'admin@centralsuporte.local',
    is_active: true,
    role: {
      id: 1,
      name: 'Administrador',
      permissions: [],
    },
  },
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasPermission: vi.fn().mockReturnValue(true),
  hasRole: vi.fn().mockReturnValue(true),
};

const defaultTheme: ThemeContextType = {
  theme: 'dark',
  toggleTheme: vi.fn(),
};

function renderDashboard() {
  return render(
    <ThemeContext.Provider value={defaultTheme}>
      <AuthContext.Provider value={defaultAuth}>
        <DashboardPage />
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders technical shift header and user information', () => {
    renderDashboard();

    expect(screen.getByText(/painel do técnico — admin/i)).toBeInTheDocument();
    expect(screen.getByText(/turno operacional ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/perfil: administrador/i)).toBeInTheDocument();
  });

  it('renders tactical operational metrics cards', () => {
    renderDashboard();

    expect(screen.getByText('Tarefas Pendentes')).toBeInTheDocument();
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
    expect(screen.getByText('Lembretes Ativos')).toBeInTheDocument();
    expect(screen.getAllByText('Atendimentos Recentes').length).toBeGreaterThanOrEqual(1);
  });

  it('renders task list and allows toggling task completion status', () => {
    renderDashboard();

    const taskText = screen.getByText('Validar link de contingência 4G - Filial 04');
    expect(taskText).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    // Toggle first checkbox
    fireEvent.click(checkboxes[0]);
    expect(taskText.className).toContain('line-through');

    // Toggle back
    fireEvent.click(checkboxes[0]);
    expect(taskText.className).not.toContain('line-through');
  });

  it('renders recent attendances associated with OTRS tickets', () => {
    renderDashboard();

    expect(screen.getAllByText('Atendimentos Recentes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('#20260924001')).toBeInTheDocument();
    expect(screen.getByText('Falha de comunicação SAT / PDV 03')).toBeInTheDocument();
  });

  it('renders shift reminders and quick knowledge procedures', () => {
    renderDashboard();

    expect(screen.getByText('Lembretes do Turno')).toBeInTheDocument();
    expect(screen.getByText(/passagem de turno com técnico da noite/i)).toBeInTheDocument();
    expect(screen.getByText('Procedimentos Rápidos')).toBeInTheDocument();
    expect(screen.getByText(/comandos úteis para reinicialização do spooler e sat fiscal/i)).toBeInTheDocument();
  });

  it('displays the official OTRS architectural boundary banner', () => {
    renderDashboard();

    expect(screen.getByText('Integração Oficial com OTRS')).toBeInTheDocument();
    expect(
      screen.getByText(/abertura, sla, histórico do cliente e fechamento ocorrem exclusivamente no otrs/i)
    ).toBeInTheDocument();
  });
});
