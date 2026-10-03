import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GettingStarted } from '@/components/dashboard/GettingStarted';

describe('GettingStarted', () => {
  beforeEach(() => localStorage.clear());

  it('explains the flow and links to the right screens', () => {
    const onNavigate = vi.fn();
    render(<GettingStarted onNavigate={onNavigate} />);
    expect(screen.getByText('Primeiros passos na Central')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Novo atendimento/ }));
    expect(onNavigate).toHaveBeenCalledWith('attendance?new=true');
  });

  it('stays hidden after "Entendi"', () => {
    const { unmount } = render(<GettingStarted onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(screen.queryByText('Primeiros passos na Central')).not.toBeInTheDocument();
    unmount();
    render(<GettingStarted onNavigate={vi.fn()} />);
    expect(screen.queryByText('Primeiros passos na Central')).not.toBeInTheDocument();
  });
});
