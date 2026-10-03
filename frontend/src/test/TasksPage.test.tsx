import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TasksPage } from '@/pages/TasksPage';
import { organizationService } from '@/services/organizationService';
import type { Task } from '@/types/tasks';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    hasPermission: vi.fn().mockReturnValue(true),
  }),
}));
vi.mock('@/services/organizationService', () => ({
  organizationService: {
    getTasks: vi.fn(),
    getTaskById: vi.fn(),
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
    vi.mocked(organizationService.getTasks).mockResolvedValue({
      items: mockTasks,
      page: 1,
      limit: 50,
      total: mockTasks.length,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    });
    vi.mocked(organizationService.getTaskById).mockResolvedValue(mockTasks[0]);
    vi.mocked(organizationService.getReminders).mockResolvedValue([]);
    vi.mocked(organizationService.getCalendarEvents).mockResolvedValue([]);
  });

  it('renders header, metrics cards, reminders and calendar', async () => {
    render(<TasksPage />);

    expect(screen.getByRole('heading', { name: 'Tarefas e Agenda' })).toBeInTheDocument();
    
    // Reminders and Calendar should be in the document right away
    expect(screen.getByText('Lembretes de Turno')).toBeInTheDocument();
    expect(screen.getByText('Eventos e Manutenções Programadas')).toBeInTheDocument();

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

  it('opens task details dialog without entering an infinite loop', async () => {
    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('Verificar switch de distribuição')).toBeInTheDocument();
    });

    vi.mocked(organizationService.getTasks).mockClear();

    fireEvent.click(screen.getByText('Detalhes'));

    await waitFor(() => {
      // With Radix UI/Vaul Drawer, content might take a moment to be available in JSDOM portal.
      // We check if the Drawer is in the document or the text is present.
      expect(document.body.innerHTML).toContain('Procedimento / Instruções');
    });

    // CRITICAL: Ensure that opening the drawer does NOT trigger another fetch
    expect(organizationService.getTasks).not.toHaveBeenCalled();
    
    // Close the drawer if possible, or just complete the test
  });
});
