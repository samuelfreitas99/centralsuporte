import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { organizationService } from '@/services/organizationService';
import { automationService } from '@/services/automationService';
import type { Reminder } from '@/types/tasks';
import type { AutomationTriggerResponse } from '@/types/automation';

vi.mock('@/services/organizationService');
vi.mock('@/services/automationService');

const mockReminders: Reminder[] = [
  {
    id: 101,
    title: '🚨 Tarefa Atrasada: Revisão Firewall',
    description: 'Tarefa vencida há 1 hora',
    remind_at: '2026-09-24T18:00:00Z',
    user_id: 1,
    priority: 'urgente',
    status: 'pendente',
    created_at: '2026-09-24T17:00:00Z',
  },
  {
    id: 102,
    title: '🔧 Manutenção Programada: SW-CORE',
    description: 'Manutenção agendada para amanhã',
    remind_at: '2026-09-25T10:00:00Z',
    user_id: 1,
    priority: 'alta',
    status: 'pendente',
    created_at: '2026-09-24T17:30:00Z',
  },
];

const mockTriggerResponse: AutomationTriggerResponse = {
  executed_at: '2026-09-24T20:00:00Z',
  tasks_evaluated: 2,
  task_reminders_created: 1,
  maintenances_evaluated: 1,
  maintenance_reminders_created: 0,
  equipment_alerts_created: 0,
  total_created: 1,
  error: null,
};

describe('NotificationsDropdown (Phase 13 Automation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationService.getReminders).mockResolvedValue(mockReminders);
    vi.mocked(organizationService.updateReminderStatus).mockResolvedValue({} as any);
    vi.mocked(automationService.triggerRules).mockResolvedValue(mockTriggerResponse);
  });

  it('renders notification bell button with pending count badge', async () => {
    render(<NotificationsDropdown />);

    await waitFor(() => {
      expect(organizationService.getReminders).toHaveBeenCalledWith('pendente');
    });

    const bellButton = screen.getByRole('button', { name: /Abrir notificações/i });
    expect(bellButton).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('opens panel on bell click and displays pending reminders', async () => {
    render(<NotificationsDropdown />);

    const bellButton = screen.getByRole('button', { name: /Abrir notificações/i });
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Alertas & Regras Reativas')).toBeInTheDocument();
      expect(screen.getByText(/Revisão Firewall/i)).toBeInTheDocument();
      expect(screen.getByText(/Manutenção Programada: SW-CORE/i)).toBeInTheDocument();
      expect(screen.getByText('Urgente')).toBeInTheDocument();
    });
  });

  it('triggers automation rules on verify button click', async () => {
    render(<NotificationsDropdown />);

    const bellButton = screen.getByRole('button', { name: /Abrir notificações/i });
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Verificar')).toBeInTheDocument();
    });

    const verifyButton = screen.getByRole('button', { name: /Verificar/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(automationService.triggerRules).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/novo\(s\) alerta\(s\) gerado\(s\)/i)).toBeInTheDocument();
    });
  });

  it('resolves a reminder when clicking check button', async () => {
    render(<NotificationsDropdown />);

    const bellButton = screen.getByRole('button', { name: /Abrir notificações/i });
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText(/Revisão Firewall/i)).toBeInTheDocument();
    });

    const resolveButtons = screen.getAllByTitle('Marcar como resolvido');
    expect(resolveButtons.length).toBeGreaterThan(0);
    fireEvent.click(resolveButtons[0]);

    await waitFor(() => {
      expect(organizationService.updateReminderStatus).toHaveBeenCalledWith(101, 'concluido');
    });
  });
});
