import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TasksPage } from '@/pages/TasksPage';
import { organizationService } from '@/services/organizationService';
import type { Task } from '@/types/tasks';

vi.mock('@/services/organizationService', () => ({
  organizationService: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    deleteTask: vi.fn(),
    getReminders: vi.fn(),
    createReminder: vi.fn(),
    updateReminderStatus: vi.fn(),
    deleteReminder: vi.fn(),
    getCalendarEvents: vi.fn(),
    createCalendarEvent: vi.fn(),
    deleteCalendarEvent: vi.fn(),
    createChecklist: vi.fn(),
    addChecklistItem: vi.fn(),
    updateChecklistItem: vi.fn(),
  },
}));

const mockTasks: Task[] = [
  {
    id: 1,
    title: 'Verificar switch de distribuição',
    description: 'Checar portas trunk e LEDs',
    priority: 'alta',
    status: 'pendente',
    visibility: 'equipe',
    category: 'Redes',
    otrs_reference: 'Ticket#20260924001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    due_date: new Date().toISOString(),
    creator_id: 1,
    creator: { id: 1, username: 'admin', email: 'admin@local', is_active: true },
    assigned_users: [],
    checklists: [
      {
        id: 1,
        title: 'Inspeção Física',
        creator_id: 1,
        created_at: new Date().toISOString(),
        items: [
          { id: 1, checklist_id: 1, title: 'Conectar cabo de console', is_completed: true, position: 1 },
          { id: 2, checklist_id: 1, title: 'Testar uplink', is_completed: false, position: 2 },
        ],
      },
    ],
  },
];

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationService.getTasks).mockResolvedValue(mockTasks);
    vi.mocked(organizationService.getReminders).mockResolvedValue([]);
    vi.mocked(organizationService.getCalendarEvents).mockResolvedValue([]);
  });

  it('renders header, tabs, and metrics cards', async () => {
    render(<TasksPage />);

    expect(screen.getByText('Organização Operacional')).toBeInTheDocument();
    expect(screen.getByText('Tarefas e Checklists')).toBeInTheDocument();
    expect(screen.getByText('Lembretes')).toBeInTheDocument();
    expect(screen.getByText('Calendário')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Verificar switch de distribuição')).toBeInTheDocument();
    });

    expect(screen.getByText('Ticket#20260924001')).toBeInTheDocument();
    expect(screen.getByText('Redes')).toBeInTheDocument();
    expect(screen.getAllByText(/alta/i).length).toBeGreaterThanOrEqual(1);
  });

  it('opens and cancels new task dialog', async () => {
    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('Nova Tarefa')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Nova Tarefa'));

    expect(screen.getByText('Nova Tarefa Operacional')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Verificar switch do rack 02')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByText('Nova Tarefa Operacional')).not.toBeInTheDocument();
    });
  });

  it('opens task details dialog with checklist progress', async () => {
    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('Verificar switch de distribuição')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Detalhes'));

    await waitFor(() => {
      expect(screen.getByText('Procedimento / Instruções')).toBeInTheDocument();
      expect(screen.getByText('Checar portas trunk e LEDs')).toBeInTheDocument();
      expect(screen.getByText('Inspeção Física')).toBeInTheDocument();
      expect(screen.getByText('Conectar cabo de console')).toBeInTheDocument();
      expect(screen.getByText('Testar uplink')).toBeInTheDocument();
    });
  });

  it('switches between tabs to Reminders and Calendar', async () => {
    render(<TasksPage />);

    // Click Lembretes
    fireEvent.click(screen.getByText('Lembretes'));
    await waitFor(() => {
      expect(screen.getByText('Lembretes de Turno')).toBeInTheDocument();
      expect(screen.getByText('Novo Lembrete')).toBeInTheDocument();
    });

    // Click Calendario
    fireEvent.click(screen.getByText('Calendário'));
    await waitFor(() => {
      expect(screen.getByText('Eventos e Manutenções Programadas')).toBeInTheDocument();
      expect(screen.getByText('Agendar Evento')).toBeInTheDocument();
    });
  });
});
