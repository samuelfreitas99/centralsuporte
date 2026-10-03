import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { searchService } from '@/services/searchService';
import type { GlobalSearchResponse } from '@/types/search';

vi.mock('@/services/searchService');

const mockSearchResponse: GlobalSearchResponse = {
  query: 'switch',
  total_results: 3,
  results: [
    {
      id: 1,
      entity_type: 'knowledge',
      title: 'Configuração VLAN no Switch Core HP',
      snippet: 'Manual completo para criação de VLANs e entroncamento 802.1Q.',
      badge: 'REDES',
      created_at: '2026-09-24T10:00:00Z',
      url_tab: 'knowledge',
    },
    {
      id: 2,
      entity_type: 'equipment',
      title: 'SW-CORE-SEARCH',
      snippet: 'IP: 10.10.10.1 | Modelo: HP 2920',
      badge: 'PAT-SEARCH-01',
      created_at: '2026-09-24T10:00:00Z',
      url_tab: 'equipment',
    },
    {
      id: 3,
      entity_type: 'attendance',
      title: 'Queda de portas no switch core',
      snippet: 'Troca de cabo patch cord e reativação da porta 2.',
      badge: '2026092410009999',
      created_at: '2026-09-24T10:00:00Z',
      url_tab: 'attendance',
    },
  ],
};

describe('CommandPalette (busca global)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchService.globalSearch).mockResolvedValue(mockSearchResponse);
  });

  it('asks for at least 2 characters before searching', () => {
    render(<CommandPalette open onOpenChange={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Termo de busca'), { target: { value: 's' } });
    expect(screen.getByText(/pelo menos 2 caracteres/i)).toBeInTheDocument();
    expect(searchService.globalSearch).not.toHaveBeenCalled();
  });

  it('searches all modules and opens the clicked item through a deep link', async () => {
    const onNavigate = vi.fn();
    const onOpenChange = vi.fn();
    render(<CommandPalette open onOpenChange={onOpenChange} onNavigate={onNavigate} />);

    fireEvent.change(screen.getByLabelText('Termo de busca'), { target: { value: 'switch' } });

    await waitFor(() => {
      expect(searchService.globalSearch).toHaveBeenCalledWith(expect.objectContaining({ q: 'switch' }));
      expect(screen.getByText('SW-CORE-SEARCH')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SW-CORE-SEARCH'));
    expect(onNavigate).toHaveBeenCalledWith('equipment?id=2');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('supports keyboard navigation with arrows and Enter', async () => {
    const onNavigate = vi.fn();
    render(<CommandPalette open onOpenChange={vi.fn()} onNavigate={onNavigate} />);
    const input = screen.getByLabelText('Termo de busca');
    fireEvent.change(input, { target: { value: 'switch' } });
    await screen.findByText('Queda de portas no switch core');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onNavigate).toHaveBeenCalledWith('attendance?id=3');
  });
});
