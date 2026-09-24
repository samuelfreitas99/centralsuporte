import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

// Mock contexts
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'samuel.admin',
      role: { id: 1, name: 'Administrador' },
    },
    logout: vi.fn(),
    hasPermission: () => true,
  }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('@/services/automationService', () => ({
  automationService: {
    getStatus: vi.fn().mockResolvedValue({
      scheduler_running: true,
      pending_alerts_count: 0,
      active_rules_count: 3,
      recent_alerts: [],
      rules_catalog: [],
    }),
    triggerRules: vi.fn().mockResolvedValue({
      status: 'success',
      triggered_rules: [],
      reminders_generated: 0,
      timestamp: '2026-09-24T20:00:00Z',
    }),
  },
}));

describe('Phase 15 — Accessibility (a11y), UX & Performance', () => {
  it('renders WCAG skip-to-content link targeting #main-content', () => {
    render(
      <AppLayout currentTab="dashboard" onSelectTab={vi.fn()}>
        <div>Conteúdo de Teste</div>
      </AppLayout>
    );

    const skipLink = screen.getByText('Pular para o conteúdo principal');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    const mainElement = screen.getByRole('main');
    expect(mainElement).toHaveAttribute('id', 'main-content');
  });

  it('triggers global search tab navigation on Ctrl+K shortcut', () => {
    const onSelectTab = vi.fn();
    render(
      <AppLayout currentTab="dashboard" onSelectTab={onSelectTab}>
        <div>Conteúdo</div>
      </AppLayout>
    );

    // Simulate Ctrl+K
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(onSelectTab).toHaveBeenCalledWith('search-reports');

    // Simulate Cmd+K (Mac)
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(onSelectTab).toHaveBeenCalledWith('search-reports');
  });

  it('renders quick search trigger in Header and navigates to search-reports', () => {
    const onSelectTab = vi.fn();
    render(<Header onToggleSidebar={vi.fn()} onSelectTab={onSelectTab} />);

    const searchButton = screen.getByRole('button', {
      name: /Pesquisa Global e Relatórios \(Atalho Ctrl\+K\)/i,
    });
    expect(searchButton).toBeInTheDocument();
    expect(screen.getByText('Busca Global...')).toBeInTheDocument();

    fireEvent.click(searchButton);
    expect(onSelectTab).toHaveBeenCalledWith('search-reports');
  });

  it('renders PageSkeleton with accessible aria attributes and pulse placeholders', () => {
    render(<PageSkeleton />);

    const skeletonContainer = screen.getByLabelText('Carregando módulo...');
    expect(skeletonContainer).toBeInTheDocument();
    expect(skeletonContainer).toHaveAttribute('aria-busy', 'true');
  });
});
