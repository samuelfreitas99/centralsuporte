import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchAndReportsPage } from '@/pages/SearchAndReportsPage';
import { searchService } from '@/services/searchService';
import { reportsService } from '@/services/reportsService';
import { infrastructureService } from '@/services/infrastructureService';
import type { GlobalSearchResponse } from '@/types/search';
import type { OperationalSummaryReport } from '@/types/reports';
import type { StoreItem } from '@/types/infrastructure';

vi.mock('@/services/searchService');
vi.mock('@/services/reportsService');
vi.mock('@/services/infrastructureService');

const mockStores: StoreItem[] = [
  {
    id: 1,
    name: 'Loja Centro 01',
    code: 'LJ-01',
    status: 'ativa',
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
  },
];

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

describe('SearchAndReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(infrastructureService.getStores).mockResolvedValue(mockStores);
    vi.mocked(searchService.globalSearch).mockResolvedValue(mockSearchResponse);
    vi.mocked(reportsService.getSummary).mockResolvedValue(mockReportSummary);
    vi.mocked(reportsService.downloadCsvExport).mockResolvedValue(undefined);
  });

  it('renders search view by default with initial guide cards', async () => {
    render(<SearchAndReportsPage />);

    expect(screen.getByText('Pesquisa & Relatórios Operacionais')).toBeInTheDocument();
    expect(screen.getByText('Pesquisa Unificada')).toBeInTheDocument();
    expect(screen.getByText('Relatórios & Métricas')).toBeInTheDocument();

    expect(screen.getByPlaceholderText(/Pesquise por procedimento, IP, hostname/i)).toBeInTheDocument();
    expect(screen.getByText('Comandos & Sintaxes')).toBeInTheDocument();
    expect(screen.getByText('Histórico & OTRS')).toBeInTheDocument();
  });

  it('performs unified search on input change and displays results', async () => {
    const handleSelectTab = vi.fn();
    render(<SearchAndReportsPage onSelectTab={handleSelectTab} />);

    const searchInput = screen.getByPlaceholderText(/Pesquise por procedimento/i);
    fireEvent.change(searchInput, { target: { value: 'switch' } });

    await waitFor(() => {
      expect(searchService.globalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'switch',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Configuração VLAN no Switch Core HP')).toBeInTheDocument();
      expect(screen.getByText('SW-CORE-SEARCH')).toBeInTheDocument();
      expect(screen.getByText('Queda de portas no switch core')).toBeInTheDocument();
    });

    // Test clicking navigation button
    const navButtons = screen.getAllByText('Ir para Módulo');
    expect(navButtons.length).toBeGreaterThan(0);
    fireEvent.click(navButtons[0]);
    expect(handleSelectTab).toHaveBeenCalledWith('knowledge');
  });

  it('filters by entity type pill', async () => {
    render(<SearchAndReportsPage />);

    const searchInput = screen.getByPlaceholderText(/Pesquise por procedimento/i);
    fireEvent.change(searchInput, { target: { value: 'switch' } });

    await waitFor(() => {
      expect(searchService.globalSearch).toHaveBeenCalled();
    });

    // Click filter for Equipment
    const equipFilter = screen.getByRole('button', { name: /Equipamentos/i });
    fireEvent.click(equipFilter);

    await waitFor(() => {
      expect(searchService.globalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'switch',
          entity_type: 'equipment',
        })
      );
    });
  });

  it('switches to reports tab, displays operational KPIs, recurrent issues and triggers CSV export', async () => {
    render(<SearchAndReportsPage />);

    // Switch to Reports tab
    const reportsTabButton = screen.getByRole('button', { name: /Relatórios & Métricas/i });
    fireEvent.click(reportsTabButton);

    await waitFor(() => {
      expect(reportsService.getSummary).toHaveBeenCalledWith(30);
    });

    // Assert KPI elements
    expect(screen.getByText('Taxa de Resolução')).toBeInTheDocument();
    expect(screen.getByText('83.33%')).toBeInTheDocument();
    expect(screen.getByText('10 de 12 atendimentos resolvidos')).toBeInTheDocument();
    expect(screen.getByText('Reincidência de Falhas no Parque de TI')).toBeInTheDocument();
    expect(screen.getByText('Ativo Crítico')).toBeInTheDocument();
    expect(screen.getByText('João Analista')).toBeInTheDocument();

    // Export CSV
    const exportButton = screen.getByRole('button', { name: /Exportar Relatório CSV/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(reportsService.downloadCsvExport).toHaveBeenCalledWith(30);
    });
  });
});
