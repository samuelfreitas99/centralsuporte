import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { organizationService } from '@/services/organizationService';
import { automationService } from '@/services/automationService';
import type { Reminder } from '@/types/tasks';

const hasPermission = vi.fn().mockReturnValue(true);
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ hasPermission }) }));
vi.mock('@/services/organizationService', () => ({
  organizationService: { getReminders: vi.fn(), updateReminderStatus: vi.fn() },
}));
vi.mock('@/services/automationService', () => ({ automationService: { triggerRules: vi.fn() } }));

const past = new Date(Date.now() - 60_000).toISOString();
const future = new Date(Date.now() + 3_600_000).toISOString();
const reminders: Reminder[] = [
  { id: 1, title: 'Tarefa Atrasada: Revisão Firewall', remind_at: past, user_id: 1, priority: 'urgente', status: 'pendente', source: 'automacao', task_id: 7, created_at: past },
  { id: 2, title: 'Manutenção Programada: SW-CORE', remind_at: past, user_id: 1, priority: 'alta', status: 'pendente', source: 'automacao', created_at: past },
  { id: 3, title: 'Ligar para a operadora', remind_at: future, user_id: 1, priority: 'media', status: 'pendente', source: 'manual', created_at: past },
];

describe('NotificationsDropdown (sino de avisos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    hasPermission.mockReturnValue(true);
    vi.mocked(organizationService.getReminders).mockResolvedValue(reminders);
    vi.mocked(organizationService.updateReminderStatus).mockResolvedValue({} as Reminder);
    vi.mocked(automationService.triggerRules).mockResolvedValue({ total_created: 2 } as never);
  });

  it('counts only reminders that are already due', async () => {
    render(<NotificationsDropdown />);
    expect(await screen.findByRole('button', { name: 'Avisos (2)' })).toBeInTheDocument();
  });

  it('lists due items; future reminders stay out of the bell', async () => {
    render(<NotificationsDropdown />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avisos (2)' }));
    expect(screen.getByText('Tarefa Atrasada: Revisão Firewall')).toBeInTheDocument();
    expect(screen.getByText('Manutenção Programada: SW-CORE')).toBeInTheDocument();
    expect(screen.queryByText('Ligar para a operadora')).not.toBeInTheDocument();
  });

  it('opens the related task when clicking a notice', async () => {
    render(<NotificationsDropdown />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avisos (2)' }));
    fireEvent.click(screen.getByText('Tarefa Atrasada: Revisão Firewall'));
    expect(window.location.hash).toBe('#tasks?id=7');
  });

  it('resolves a notice', async () => {
    render(<NotificationsDropdown />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avisos (2)' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Marcar como resolvido' })[0]);
    await waitFor(() => expect(organizationService.updateReminderStatus).toHaveBeenCalledWith(1, 'concluido'));
  });

  it('"Verificar agora" runs the rules for users who can edit tasks only', async () => {
    const { unmount } = render(<NotificationsDropdown />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avisos (2)' }));
    fireEvent.click(screen.getByRole('button', { name: /Verificar agora/ }));
    expect(await screen.findByText('2 aviso(s) novo(s)')).toBeInTheDocument();
    unmount();

    hasPermission.mockReturnValue(false);
    render(<NotificationsDropdown />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avisos (2)' }));
    expect(screen.queryByRole('button', { name: /Verificar agora/ })).not.toBeInTheDocument();
  });
});
