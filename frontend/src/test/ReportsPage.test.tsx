import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportsPage } from '@/pages/ReportsPage';
import { reportsService } from '@/services/reportsService';
import type { OperationalSummaryReport } from '@/types/reports';

vi.mock('@/services/reportsService');

const mockReportSummary: OperationalSummaryReport = {
  period_days: 30,
  attendances_total: 12,
  attendances_resolved: 10,
  attendances_in_progress: 2,
  resolution_rate: 83.3,
  maintenances_total: 8,
  maintenances_preventive: 5,
  maintenances_corrective: 3,
  maintenances_total_cost: 1450.5,
  recurrent_equipment: [
    { equipment_id: 1, hostname: 'SW-CORE-SEARCH', patrimony: 'PAT-01', store_name: 'Loja Centro 01', total_incidents: 5, attendances_count: 3, maintenances_count: 2 },
  ],
  top_technicians: [
    { technician_id: 1, username: 'joao', attendances_count: 6, maintenances_count: 4, total_actions: 10 },
  ],
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsService.getSummary).mockResolvedValue(mockReportSummary);
    vi.mocked(reportsService.downloadCsvExport).mockResolvedValue(undefined);
    vi.mocked(reportsService.getWeekly).mockResolvedValue({
      start: '2026-09-28T10:00:00Z',
      end: '2026-10-05T10:00:00Z',
      attendances_total: 12,
      attendances_resolved: 10,
      attendances_open: 2,
      by_store: [{ name: 'Loja 12', count: 5 }],
      top_equipment: [{ equipment_id: 3, name: 'PDV-03', count: 3 }],
      maintenances_done: 4,
      overdue_tasks: 2,
      pending_purchases: 1,
      low_stock_items: 0,
    });
  });

  it('shows the period summary using the backend contract and exports CSV', async () => {
    render(<ReportsPage />);

    expect(await screen.findByText('83%')).toBeInTheDocument();
    expect(reportsService.getSummary).toHaveBeenCalledWith(30);
    expect(screen.getByText('10 resolvidos · 2 em andamento')).toBeInTheDocument();
    expect(screen.getByText('5 preventivas · 3 corretivas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'SW-CORE-SEARCH' })).toHaveAttribute('href', '#equipment?id=1');
    expect(screen.getByText('joao')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '7 dias' }));
    await waitFor(() => expect(reportsService.getSummary).toHaveBeenCalledWith(7));

    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));
    await waitFor(() => expect(reportsService.downloadCsvExport).toHaveBeenCalledWith(7));
  });

  it('shows the weekly digest with what needs attention', async () => {
    render(<ReportsPage />);
    expect(await screen.findByText('Resumo da semana')).toBeInTheDocument();
    expect(screen.getByText('Loja 12')).toBeInTheDocument();
    expect(screen.getByText('2 tarefa(s) atrasada(s)')).toBeInTheDocument();
    expect(screen.getByText('1 compra(s) aguardando aprovação').closest('a')).toHaveAttribute('href', '#purchases?status=aguardando_aprovacao');
    expect(screen.queryByText(/estoque baixo/)).not.toBeInTheDocument();
  });
});
