import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { AuthContext } from '@/context/AuthContextDef';
import { ToastProvider } from '@/components/ui/Toast';
import { maintenanceService } from '@/services/maintenanceService';
import { infrastructureService } from '@/services/infrastructureService';
import type { AuthContextType } from '@/types/auth';
import type { MaintenanceRecord } from '@/types/maintenance';
import type { EquipmentItem } from '@/types/infrastructure';

vi.mock('@/services/maintenanceService');
vi.mock('@/services/infrastructureService');

const mockUserAuth: AuthContextType = {
  user: {
    id: 1,
    username: 'tecnico_joao',
    email: 'joao@centralsuporte.local',
    is_active: true,
    role: { id: 2, name: 'Técnico', permissions: [] },
  },
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasPermission: vi.fn().mockReturnValue(true),
  hasRole: vi.fn().mockReturnValue(true),
};

const mockEquipment: EquipmentItem[] = [
  {
    id: 1,
    hostname: 'PDV-01',
    equipment_type: 'pdv',
    patrimony: 'PAT-1001',
    ip_address: '192.168.1.10',
    store_id: 1,
    status: 'ativo',
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
  },
];

const mockMaintenances: MaintenanceRecord[] = [
  {
    id: 1,
    title: 'Revisão Preventiva Trimestral PDV 01',
    equipment_id: 1,
    store_id: 1,
    technician_id: 1,
    maintenance_type: 'preventiva',
    status: 'agendada',
    priority: 'alta',
    scheduled_date: '2026-09-25T10:00:00Z',
    performed_date: null,
    description: 'Limpeza e revisão de cabos',
    diagnosis: null,
    procedure_performed: null,
    result: null,
    cost: null,
    internal_notes: null,
    equipment: mockEquipment[0],
    store: { id: 1, name: 'Loja 01 - Centro', status: 'ativa', created_at: '', updated_at: '' },
    technician: { id: 1, username: 'tecnico_joao', email: 'joao@centralsuporte.local', is_active: true },
    checklists: [
      {
        id: 10,
        title: 'Checklist Preventiva PDV',
        description: null,
        task_id: null,
        creator_id: 1,
        created_at: '2026-09-24T10:00:00Z',
        items: [
          {
            id: 101,
            checklist_id: 10,
            title: 'Limpeza física interna e coolers',
            is_completed: false,
            position: 0,
          },
          {
            id: 102,
            checklist_id: 10,
            title: 'Inspeção de cabos de força e rede',
            is_completed: true,
            position: 1,
          },
        ],
      },
    ],
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
  },
  {
    id: 2,
    title: 'Troca da Fonte de Alimentação Servidor 01',
    equipment_id: 1,
    store_id: 1,
    technician_id: 1,
    maintenance_type: 'corretiva',
    status: 'concluida',
    priority: 'urgente',
    scheduled_date: '2026-09-24T08:00:00Z',
    performed_date: '2026-09-24T09:30:00Z',
    description: 'Servidor desligando sozinho por oscilação na fonte',
    diagnosis: 'Fonte de 500W queimada',
    procedure_performed: 'Substituída por fonte reserva do estoque e testes de carga efetuados',
    result: 'sucesso',
    cost: 350.0,
    internal_notes: 'Fonte antiga enviada para descarte',
    equipment: mockEquipment[0],
    store: { id: 1, name: 'Loja 01 - Centro', status: 'ativa', created_at: '', updated_at: '' },
    technician: { id: 1, username: 'tecnico_joao', email: 'joao@centralsuporte.local', is_active: true },
    checklists: [],
    created_at: '2026-09-24T08:00:00Z',
    updated_at: '2026-09-24T09:30:00Z',
  },
];

function renderMaintenancePage() {
  return render(
    <AuthContext.Provider value={mockUserAuth}>
      <ToastProvider>
        <MaintenancePage />
      </ToastProvider>
    </AuthContext.Provider>
  );
}

describe('MaintenancePage (Phase 9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(maintenanceService.getMaintenances).mockResolvedValue(mockMaintenances);
    vi.mocked(maintenanceService.getMetrics).mockResolvedValue({
      total: 2,
      agendadas: 1,
      em_andamento: 0,
      concluidas: 1,
      preventivas: 1,
      corretivas: 1,
    });
    vi.mocked(infrastructureService.getEquipment).mockResolvedValue(mockEquipment);
    vi.mocked(maintenanceService.updateStatus).mockImplementation(async (id, payload) => {
      const found = mockMaintenances.find((m) => m.id === id);
      return {
        ...found!,
        status: payload.status as any,
        result: payload.result as any,
        procedure_performed: payload.procedure_performed || found?.procedure_performed,
      };
    });
    vi.mocked(maintenanceService.createMaintenance).mockImplementation(async (payload) => ({
      id: 3,
      title: payload.title,
      equipment_id: payload.equipment_id,
      store_id: payload.store_id || 1,
      technician_id: 1,
      maintenance_type: payload.maintenance_type as any,
      status: (payload.status as any) || 'agendada',
      priority: (payload.priority as any) || 'media',
      scheduled_date: payload.scheduled_date || null,
      performed_date: null,
      description: payload.description || null,
      diagnosis: null,
      procedure_performed: null,
      result: null,
      cost: null,
      internal_notes: null,
      equipment: mockEquipment[0],
      store: null,
      technician: null,
      checklists: [],
      created_at: '2026-09-24T12:00:00Z',
      updated_at: '2026-09-24T12:00:00Z',
    }));
    vi.mocked(maintenanceService.toggleChecklistItem).mockResolvedValue({ id: 101, is_completed: true });
  });

  it('renders page header, Phase 9 badge, and tactical metrics', async () => {
    renderMaintenancePage();

    expect(screen.getByText('Manutenções & Planos Preventivos')).toBeInTheDocument();
    expect(screen.getByText('Fase 9')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Revisão Preventiva Trimestral PDV 01')).toBeInTheDocument();
      expect(screen.getByText('Troca da Fonte de Alimentação Servidor 01')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Registrado')).toBeInTheDocument();
    expect(screen.getByText('Próximas intervenções')).toBeInTheDocument();
  });

  it('displays maintenance cards with equipment, status, priority and checklist counter', async () => {
    renderMaintenancePage();

    await waitFor(() => {
      expect(screen.getByText('Revisão Preventiva Trimestral PDV 01')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/PAT-1001/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Checklist Preventiva PDV')).toBeInTheDocument();
    expect(screen.getByText('1/2 concluídos')).toBeInTheDocument();
  });

  it('starts scheduled maintenance and toggles status', async () => {
    renderMaintenancePage();

    await waitFor(() => {
      expect(screen.getByText('Revisão Preventiva Trimestral PDV 01')).toBeInTheDocument();
    });

    const startBtn = screen.getByRole('button', { name: /iniciar/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(maintenanceService.updateStatus).toHaveBeenCalledWith(1, { status: 'em_andamento' });
    });
  });

  it('allows opening conclusion modal and completing maintenance', async () => {
    // Make first item em_andamento so conclude button appears
    vi.mocked(maintenanceService.getMaintenances).mockResolvedValue([
      {
        ...mockMaintenances[0],
        status: 'em_andamento',
      },
    ]);

    renderMaintenancePage();

    await waitFor(() => {
      expect(screen.getByText('Revisão Preventiva Trimestral PDV 01')).toBeInTheDocument();
    });

    const concludeBtn = screen.getByRole('button', { name: /concluir/i });
    fireEvent.click(concludeBtn);

    expect(screen.getByText('Concluir Manutenção Técnica')).toBeInTheDocument();

    // Fill in procedure
    const procedureInput = screen.getByPlaceholderText(/descreva passo a passo o que foi feito/i);
    fireEvent.change(procedureInput, {
      target: { value: 'Limpeza de coolers e troca de cabos realizada com sucesso.' },
    });

    const submitBtn = screen.getByRole('button', { name: /concluir manutenção/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(maintenanceService.updateStatus).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'concluida',
          result: 'sucesso',
          procedure_performed: 'Limpeza de coolers e troca de cabos realizada com sucesso.',
        })
      );
    });
  });

  it('toggles checklist items on expansion', async () => {
    renderMaintenancePage();

    await waitFor(() => {
      expect(screen.getByText('Revisão Preventiva Trimestral PDV 01')).toBeInTheDocument();
    });

    const expandBtn = screen.getByRole('button', { name: /expandir checklist/i });
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Limpeza física interna e coolers')).toBeInTheDocument();
    });

    const itemRow = screen.getByText('Limpeza física interna e coolers');
    fireEvent.click(itemRow);

    await waitFor(() => {
      expect(maintenanceService.toggleChecklistItem).toHaveBeenCalledWith(10, 101, true);
    });
  });

  it('opens create modal, fills form and schedules maintenance', async () => {
    renderMaintenancePage();

    await waitFor(() => {
      expect(screen.getByText('Revisão Preventiva Trimestral PDV 01')).toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: /nova manutenção/i });
    fireEvent.click(newBtn);

    expect(screen.getByRole('heading', { name: 'Nova Manutenção' })).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/ex: preventiva semestral pdv/i);
    fireEvent.change(titleInput, { target: { value: 'Revisão Preventiva Switch 01' } });

    // Select equipment
    const eqSelect = screen.getByDisplayValue(/selecione um equipamento.../i);
    fireEvent.change(eqSelect, { target: { value: '1' } });

    const submitBtn = screen.getByRole('button', { name: /salvar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(maintenanceService.createMaintenance).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Revisão Preventiva Switch 01',
          equipment_id: 1,
        })
      );
    });
  });
});
