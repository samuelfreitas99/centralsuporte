import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportsPage } from '@/pages/ReportsPage';
import { reportsService } from '@/services/reportsService';
import type { OperationalSummaryReport } from '@/types/reports';

vi.mock('@/services/reportsService');

const mockReportSummary: OperationalSummaryReport = {
  period_days: 30,
  total_attendances: 12,
  resolved_attendances: 10,
  attendance_resolution_rate: 83.33,
  total_maintenances: 8,
  completed_maintenances: 7,
  total_maintenance_cost: 1450.5,
  recurrent_equipment: [
    {
      equipment_id: 1,
      hostname: 'SW-CORE-SEARCH',
      patrimony: 'PAT-SEARCH-01',
      equipment_type: 'switch',
      store_name: 'Loja Centro 01',
      incident_count: 3,
      maintenance_count: 2,
      total_events: 5,
    },
  ],
  technicians_performance: [
    {
      technician_id: 1,
      technician_name: 'João Analista',
      resolved_attendances: 6,
      completed_maintenances: 4,
      total_actions: 10,
    },
  ],
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsService.getSummary).mockResolvedValue(mockReportSummary);
    vi.mocked(reportsService.downloadCsvExport).mockResolvedValue(undefined);
  });

  it('loads operational KPIs, recurrent issues and triggers CSV export', async () => {
    render(<ReportsPage />);

    expect(screen.getByRole('heading', { name: /Relatórios/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(reportsService.getSummary).toHaveBeenCalledWith(30);
      expect(screen.getByText('Taxa de Resolução')).toBeInTheDocument();
    });

    expect(screen.getByText('83.33%')).toBeInTheDocument();
    expect(screen.getByText('10 de 12 atendimentos resolvidos')).toBeInTheDocument();
    expect(screen.getByText('Reincidência de Falhas no Parque de TI')).toBeInTheDocument();
    expect(screen.getByText('Ativo Crítico')).toBeInTheDocument();
    expect(screen.getByText('João Analista')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Exportar Relatório CSV/i }));
    await waitFor(() => {
      expect(reportsService.downloadCsvExport).toHaveBeenCalledWith(30);
    });
  });
});
