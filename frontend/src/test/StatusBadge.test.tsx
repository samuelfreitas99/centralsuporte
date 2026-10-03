import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { STATUS_META } from '@/lib/status';

describe('StatusBadge / PriorityBadge', () => {
  it('uses the same label for a status everywhere', () => {
    render(<StatusBadge domain="attendance" status="resolvido" />);
    expect(screen.getByText('Resolvido')).toBeInTheDocument();
  });

  it('falls back to the raw value for unknown statuses', () => {
    render(<StatusBadge domain="maintenance" status="xpto" />);
    expect(screen.getByText('xpto')).toBeInTheDocument();
  });

  it('labels priorities in Portuguese', () => {
    render(<PriorityBadge priority="media" />);
    expect(screen.getByText('Média')).toBeInTheDocument();
  });

  it('covers every status accepted by the backend', () => {
    expect(Object.keys(STATUS_META.task)).toEqual(['pendente', 'em_andamento', 'concluida', 'cancelada']);
    expect(Object.keys(STATUS_META.attendance)).toEqual(['em_andamento', 'resolvido', 'cancelado']);
    expect(Object.keys(STATUS_META.maintenance)).toEqual(['agendada', 'em_andamento', 'concluida', 'cancelada']);
  });
});
