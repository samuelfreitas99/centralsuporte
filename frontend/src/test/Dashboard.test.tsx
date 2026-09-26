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

import { mockTasks, mockReminders, mockAttendances, mockKnowledge } from '@/services/dashboardMock';
import { organizationService } from '@/services/organizationService';
import { attendanceService } from '@/services/attendanceService';
import { knowledgeService } from '@/services/knowledgeService';

vi.mock('@/services/organizationService', () => ({
  organizationService: {
    getTasks: vi.fn(),
    getReminders: vi.fn(),
    updateTaskStatus: vi.fn(),
    updateReminderStatus: vi.fn(),
  },
}));

vi.mock('@/services/attendanceService', () => ({
  attendanceService: {
    getAttendances: vi.fn(),
  },
}));

vi.mock('@/services/knowledgeService', () => ({
  knowledgeService: {
    getArticles: vi.fn(),
  },
}));

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
    (organizationService.getTasks as any).mockResolvedValue(mockTasks);
    // Transform mockReminders to match API type (text -> title)
    (organizationService.getReminders as any).mockResolvedValue(
      mockReminders.map(r => ({ ...r, title: r.text, due_time: r.time }))
    );
    // Transform mockAttendances to match API type (otrsTicket -> otrs_ticket, updatedAt -> updated_at)
    (attendanceService.getAttendances as any).mockResolvedValue(
      mockAttendances.map(a => ({
        ...a,
        otrs_ticket: a.otrsTicket,
        updated_at: new Date().toISOString(), // give it a real date to parse
        technician: { username: a.technician },
        equipment: { name: a.equipment }
      }))
    );
    (knowledgeService.getArticles as any).mockResolvedValue(
      mockKnowledge.map(k => ({
        ...k,
        category: { name: k.category },
        tags: k.tags.map(t => ({ name: t }))
      }))
    );
  });

  it('renders technical shift header and user information', async () => {
    renderDashboard();

    expect(screen.getByText(/olá, admin/i)).toBeInTheDocument();
    expect(screen.getByText(/turno operacional ativo/i)).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('renders tactical operational metrics cards', async () => {
    renderDashboard();

    expect(await screen.findByText('Pendentes')).toBeInTheDocument();
    expect(await screen.findByText('Em Curso')).toBeInTheDocument();
    expect((await screen.findAllByText('Atendimentos')).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText('Base')).length).toBeGreaterThanOrEqual(1);
  });

  it('renders task list and allows toggling task completion status', async () => {
    renderDashboard();

    const taskText = await screen.findByText('Validar link de contingência 4G - Filial 04');
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

  it('renders recent attendances associated with OTRS tickets', async () => {
    renderDashboard();

    expect((await screen.findAllByText('Atendimentos')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('#20260924001')).toBeInTheDocument();
    expect(await screen.findByText('Falha de comunicação SAT / PDV 03')).toBeInTheDocument();
  });

  it('renders shift reminders and quick knowledge procedures', async () => {
    renderDashboard();

    expect(await screen.findByText('Lembretes')).toBeInTheDocument();
    expect(await screen.findByText(/passagem de turno com técnico da noite/i)).toBeInTheDocument();
    expect(await screen.findByText('Base de Conhecimento')).toBeInTheDocument();
    expect(await screen.findByText(/comandos úteis para reinicialização do spooler e sat fiscal/i)).toBeInTheDocument();
  });

  it('displays the official OTRS architectural boundary banner', async () => {
    renderDashboard();

    expect(await screen.findByText('Integração Oficial com OTRS')).toBeInTheDocument();
    expect(
      screen.getByText(/abertura, histórico do cliente e encerramento ocorrem exclusivamente no sistema otrs/i)
    ).toBeInTheDocument();
  });
});
