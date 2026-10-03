import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InfrastructurePage } from '@/pages/InfrastructurePage';
import { AuthContext } from '@/context/AuthContextDef';
import { ToastProvider } from '@/components/ui/Toast';
import { infrastructureService } from '@/services/infrastructureService';
import type { AuthContextType } from '@/types/auth';
import type {
  StoreItem,
  DepartmentItem,
  EquipmentItem,
  LicenseItem,
  StockItem,
} from '@/types/infrastructure';

vi.mock('@/services/infrastructureService');

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockUserAuth: AuthContextType = {
  user: {
    id: 1,
    username: 'admin',
    email: 'admin@centralsuporte.local',
    is_active: true,
    role: { id: 1, name: 'Administrador', permissions: [] },
  },
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasPermission: vi.fn().mockReturnValue(true),
  hasRole: vi.fn().mockReturnValue(true),
};

const mockStores: StoreItem[] = [
  {
    id: 1,
    name: 'Loja 01 - Matriz Centro',
    code: 'LJ-01',
    address: 'Av. Brasil, 500',
    phone: '(11) 3333-4444',
    status: 'ativa',
    notes: 'Loja principal',
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
  },
];

const mockDepartments: DepartmentItem[] = [
  {
    id: 1,
    name: 'Frente de Caixa',
    store_id: 1,
    description: 'Caixas 01 a 08',
    created_at: '2026-09-24T10:00:00Z',
  },
];

const mockEquipment: EquipmentItem[] = [
  {
    id: 1,
    patrimony: 'PAT-2026-001',
    hostname: 'PDV-01-MATRIZ',
    equipment_type: 'pdv',
    brand: 'Bematech',
    model: 'RC-8400',
    serial_number: 'SN-PDV-001',
    ip_address: '10.0.29.51',
    mac_address: 'AA:BB:CC:11:22:33',
    operating_system: 'Windows 10 IoT',
    store_id: 1,
    store: mockStores[0],
    department_id: 1,
    department: mockDepartments[0],
    assigned_user: 'Operador Caixa 01',
    status: 'ativo',
    notes: 'PDV principal de alta demanda',
    history: [
      {
        id: 10,
        equipment_id: 1,
        event_type: 'cadastro',
        description: 'Equipamento cadastrado por admin.',
        created_at: '2026-09-24T10:00:00Z',
      },
    ],
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
  },
];

const mockLicenses: LicenseItem[] = [
  {
    id: 1,
    name: 'Windows 11 Pro OEM',
    license_type: 'oem',
    vendor: 'Microsoft',
    license_key: 'XXXXX-YYYYY-12345',
    total_seats: 5,
    used_seats: 2,
    cost: 800.0,
    status: 'ativa',
    notes: 'Lote de licenças OEM',
    assignments: [
      {
        id: 101,
        license_id: 1,
        assigned_to: 'PDV-01-MATRIZ',
        assigned_at: '2026-09-24T10:00:00Z',
      },
      {
        id: 102,
        license_id: 1,
        assigned_to: 'Gerente Carlos',
        assigned_at: '2026-09-24T10:00:00Z',
      },
    ],
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
  },
];

const mockStock: StockItem[] = [
  {
    id: 1,
    name: 'Toner HP Laser 85A',
    category: 'suprimentos',
    part_number: 'CE285A',
    current_quantity: 1,
    min_quantity: 3,
    unit: 'unidade',
    location: 'Armário TI - Prateleira 2',
    is_low_stock: true,
    movements: [],
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
  },
];

function renderInfrastructurePage(auth = mockUserAuth) {
  return render(
    <AuthContext.Provider value={auth}>
      <ToastProvider>
        <InfrastructurePage />
      </ToastProvider>
    </AuthContext.Provider>
  );
}

describe('InfrastructurePage (Phase 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(infrastructureService.getStores).mockResolvedValue(mockStores);
    vi.mocked(infrastructureService.getDepartments).mockResolvedValue(mockDepartments);
    vi.mocked(infrastructureService.getEquipment).mockResolvedValue(mockEquipment);
    vi.mocked(infrastructureService.getLicenses).mockResolvedValue(mockLicenses);
    vi.mocked(infrastructureService.getStockItems).mockResolvedValue(mockStock);
  });

  it('renders page header without development phase labels', async () => {
    renderInfrastructurePage();

    expect(screen.getByRole('heading', { name: 'Equipamentos e Lojas' })).toBeInTheDocument();
    expect(screen.queryByText('Fase 8')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('PDV-01-MATRIZ')).toBeInTheDocument();
      expect(screen.getByText('10.0.29.51')).toBeInTheDocument();
    });
  });

  it('displays equipment details and handles technical history drawer', async () => {
    renderInfrastructurePage();

    await waitFor(() => {
      expect(screen.getByText('PDV-01-MATRIZ')).toBeInTheDocument();
      expect(screen.getByText('PAT-2026-001')).toBeInTheDocument();
      expect(screen.getAllByText('Ativo').length).toBeGreaterThanOrEqual(1);
    });

    const eqRow = screen.getByText('PDV-01-MATRIZ');
    fireEvent.click(eqRow);

    await waitFor(() => {
      expect(screen.getByText('Informações')).toBeInTheDocument();
      expect(screen.getByText('Histórico')).toBeInTheDocument();
    });

    const historyTabBtn = screen.getByText('Histórico');
    fireEvent.click(historyTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Equipamento cadastrado por admin.')).toBeInTheDocument();
    });

    const closeBtn = screen.getAllByRole('button', { name: /fechar/i })[0];
    fireEvent.click(closeBtn);
  });

  it('switches to Lojas & Departamentos tab and renders units', async () => {
    renderInfrastructurePage();

    await waitFor(() => {
      expect(screen.getByText('PDV-01-MATRIZ')).toBeInTheDocument();
    });

    const storesTabBtn = screen.getByRole('button', { name: /lojas & departamentos/i });
    fireEvent.click(storesTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Loja 01 - Matriz Centro')).toBeInTheDocument();
      expect(screen.getByText('LJ-01')).toBeInTheDocument();
      expect(screen.getByText('Frente de Caixa')).toBeInTheDocument();
    });
  });

  it('switches to Licenças tab and displays seat allocation progress', async () => {
    renderInfrastructurePage();

    await waitFor(() => {
      expect(screen.getByText('PDV-01-MATRIZ')).toBeInTheDocument();
    });

    const licTabBtn = screen.getByRole('button', { name: /licenças/i });
    fireEvent.click(licTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Windows 11 Pro OEM')).toBeInTheDocument();
      expect(screen.getByText('Microsoft')).toBeInTheDocument();
      expect(screen.getByText(/2 de 5 ocupados/i)).toBeInTheDocument();
      expect(screen.getByText('Gerente Carlos')).toBeInTheDocument();
    });
  });

  it('switches to Estoque Operacional tab and shows low stock alert badge', async () => {
    renderInfrastructurePage();

    await waitFor(() => {
      expect(screen.getByText('PDV-01-MATRIZ')).toBeInTheDocument();
    });

    const stockTabBtn = screen.getByRole('button', { name: /estoque operacional/i });
    fireEvent.click(stockTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Toner HP Laser 85A/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/CE285A/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Crítico/i).length).toBeGreaterThan(0);
  });

  it('opens and cancels new equipment modal', async () => {
    renderInfrastructurePage();

    await waitFor(() => {
      expect(screen.getByText('PDV-01-MATRIZ')).toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: /novo equipamento/i });
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Novo Equipamento').length).toBeGreaterThanOrEqual(1);
    });

    const closeBtn = screen.getAllByRole('button', { name: /fechar/i })[0];
    fireEvent.click(closeBtn);
  });
});
