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

import { mockTasks, mockReminders, mockAttendances, mockKnowledge } from './fixtures/dashboardMock';
import { pageOf } from './fixtures/pagination';
import { organizationService } from '@/services/organizationService';
import { attendanceService } from '@/services/attendanceService';
import { knowledgeService } from '@/services/knowledgeService';
import { dashboardService } from '@/services/dashboardService';
import type { DashboardSummary } from '@/types/dashboard';

vi.mock('@/services/dashboardService', () => ({
  dashboardService: { getSummary: vi.fn() },
}));

const summary: DashboardSummary = {
  generated_at: '2026-10-03T12:00:00Z',
  tasks: { pending: 40, in_progress: 7, overdue: 3, urgent: 2, assigned_to_me: 5 },
  attendances: { open: 9, mine_open: 2, today: 4 },
  maintenances: { today: 1, overdue: 0, next_7_days: 6 },
  low_stock_total: 1,
  low_stock: [{ id: 1, name: 'Bobina térmica', current_quantity: 0, min_quantity: 5, unit: 'caixa' }],
  expiring_licenses_total: 0,
  expiring_licenses: [],
  reminders_pending: 2,
  knowledge_published: 30,
};

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
    vi.mocked(dashboardService.getSummary).mockResolvedValue(summary);
    (organizationService.getTasks as any).mockResolvedValue({ items: mockTasks, page: 1, limit: 10, total: mockTasks.length, total_pages: 1, has_next: false, has_prev: false });
    // Transform mockReminders to match API type (text -> title)
    (organizationService.getReminders as any).mockResolvedValue(
      mockReminders.map(r => ({ ...r, title: r.text, due_time: r.time }))
    );
    // Transform mockAttendances to match API type (otrsTicket -> otrs_ticket, updatedAt -> updated_at)
    (attendanceService.getAttendances as any).mockResolvedValue(pageOf(
      mockAttendances.map(a => ({
        ...a,
        otrs_ticket: a.otrsTicket,
        updated_at: new Date().toISOString(), // give it a real date to parse
        technician: { username: a.technician },
        equipment: { name: a.equipment }
      }))
    ));
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
    expect(screen.getByText('Seu turno')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('renders real server-side counts instead of counting loaded items', async () => {
    renderDashboard();

    expect(await screen.findByText('Minhas tarefas')).toBeInTheDocument();
    expect(screen.getByText('47 abertas na equipe')).toBeInTheDocument();
    expect(screen.getByText('Urgentes')).toBeInTheDocument();
    expect(screen.getByText('3 atrasadas')).toBeInTheDocument();
    expect(screen.getByText('em andamento · 4 hoje')).toBeInTheDocument();
    expect(organizationService.getTasks).toHaveBeenCalledWith(expect.objectContaining({ assigned_to_me: true }));
    // Início mostra só lembretes pessoais; alertas automáticos ficam no sino e nos alertas do turno
    expect(organizationService.getReminders).toHaveBeenCalledWith('pendente', 'manual');
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

  it('shows shift alerts that link to the right module', async () => {
    const onSelectTab = vi.fn();
    render(
      <ThemeContext.Provider value={defaultTheme}>
        <AuthContext.Provider value={defaultAuth}>
          <DashboardPage onSelectTab={onSelectTab} />
        </AuthContext.Provider>
      </ThemeContext.Provider>
    );

    fireEvent.click(await screen.findByText('3 tarefas atrasadas'));
    expect(onSelectTab).toHaveBeenCalledWith('tasks');

    fireEvent.click(screen.getByText(/1 item com estoque baixo \(Bobina térmica\)/));
    expect(onSelectTab).toHaveBeenCalledWith('equipment');
    expect(screen.getByText('1 manutenção para hoje')).toBeInTheDocument();
  });

  it('keeps working when the summary is unavailable', async () => {
    vi.mocked(dashboardService.getSummary).mockRejectedValue(new Error('offline'));
    renderDashboard();
    expect(await screen.findByText('Validar link de contingência 4G - Filial 04')).toBeInTheDocument();
    expect(screen.queryByText('Minhas tarefas')).not.toBeInTheDocument();
  });
});
