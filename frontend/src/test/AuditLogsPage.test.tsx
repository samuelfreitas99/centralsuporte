import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { auditService } from '@/services/auditService';
import type { AuditLogListResponse, AuditMetadataResponse } from '@/types/audit';

vi.mock('@/services/auditService');

const mockMetadata: AuditMetadataResponse = {
  actions: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAILED'],
  entity_types: ['user', 'role', 'attendance', 'equipment'],
};

const mockAuditLogsResponse: AuditLogListResponse = {
  total: 2,
  page: 1,
  limit: 25,
  results: [
    {
      id: 1,
      user_id: 1,
      username: 'admin',
      action: 'CREATE',
      entity_type: 'user',
      entity_id: 5,
      ip_address: '192.168.1.10',
      user_agent: 'Mozilla/5.0 Chrome',
      details: JSON.stringify({ username: 'novo_tecnico', role: 'Técnico' }),
      created_at: '2026-09-24T12:00:00Z',
    },
    {
      id: 2,
      user_id: 2,
      username: 'tecnico_joao',
      action: 'UPDATE',
      entity_type: 'equipment',
      entity_id: 10,
      ip_address: '192.168.1.15',
      user_agent: 'Mozilla/5.0 Firefox',
      details: JSON.stringify({ hostname: 'SW-CORE-01', updated_fields: { status: 'ativo' } }),
      created_at: '2026-09-24T12:30:00Z',
    },
  ],
};

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auditService.getMetadata).mockResolvedValue(mockMetadata);
    vi.mocked(auditService.getAuditLogs).mockResolvedValue(mockAuditLogsResponse);
  });

  it('renders audit page header, immutable badge and filters', async () => {
    render(<AuditLogsPage />);

    expect(screen.getByRole('heading', { name: 'Auditoria' })).toBeInTheDocument();
    expect(screen.getByText(/Registro das ações sensíveis/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Filtrar por usuário, IP, ação/i)).toBeInTheDocument();
    expect(screen.getByText('Atualizar Trilha')).toBeInTheDocument();
  });

  it('fetches and displays audit logs in table', async () => {
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenCalled();
    });

    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('tecnico_joao')).toBeInTheDocument();
    expect(screen.getAllByText('CREATE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UPDATE').length).toBeGreaterThan(0);
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.15')).toBeInTheDocument();
  });

  it('filters audit logs when selecting an action', async () => {
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'CREATE' })).toBeInTheDocument();
    });

    const actionSelect = screen.getByRole('combobox', { name: 'Filtrar por ação' });
    fireEvent.change(actionSelect, { target: { value: 'CREATE' } });

    await waitFor(() => {
      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
        })
      );
    });
  });

  it('opens details modal and displays formatted JSON payload when clicking inspect', async () => {
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    const inspectButtons = screen.getAllByText('Inspecionar');
    expect(inspectButtons.length).toBeGreaterThan(0);
    fireEvent.click(inspectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Detalhes da Operação #1/i)).toBeInTheDocument();
      expect(screen.getByText(/novo_tecnico/i)).toBeInTheDocument();
      expect(screen.getByText(/Copiar JSON/i)).toBeInTheDocument();
    });
  });
});
