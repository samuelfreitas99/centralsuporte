import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendancePage } from '@/pages/AttendancePage';
import { AuthContext } from '@/context/AuthContextDef';
import { ToastProvider } from '@/components/ui/Toast';
import { attendanceService } from '@/services/attendanceService';
import type { AuthContextType } from '@/types/auth';
import type { AttendanceItem } from '@/types/attendance';

import { pageOf } from './fixtures/pagination';

vi.mock('@/services/attendanceService');

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

const mockAttendances: AttendanceItem[] = [
  {
    id: 1,
    title: 'Falha Spooler de Impressão PDV 02',
    otrs_ticket: '202609240099',
    otrs_url: 'https://otrs.empresa.local/otrs/index.pl?Ticket=99',
    requester_name: 'Gerente Carlos',
    technician_id: 1,
    technician: { id: 1, username: 'tecnico_joao', role: { id: 2, name: 'Técnico' } },
    status: 'em_andamento',
    equipment_name: 'PDV 02 - Caixa Central',
    store_department: 'Loja 02',
    problem_description: 'Impressora não responde aos comandos do PDV',
    symptoms: 'Fila travada com cupom preso',
    diagnosis: 'Serviço Spooler travado com arquivo corrompido',
    cause: 'Queda de energia',
    solution: 'Limpar fila e reiniciar serviço spooler',
    commands_used: 'net stop spooler && net start spooler',
    internal_notes: 'Orientado o operador',
    knowledge_article_id: null,
    notes: [
      {
        id: 10,
        attendance_id: 1,
        author_id: 1,
        author: { id: 1, username: 'tecnico_joao', role: { id: 2, name: 'Técnico' } },
        note: 'Primeiro teste realizado com sucesso',
        created_at: '2026-09-24T10:15:00Z',
      },
    ],
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
  },
  {
    id: 2,
    title: 'Troca de Teclado PDV 01',
    otrs_ticket: null,
    otrs_url: null,
    requester_name: 'Supervisora Ana',
    technician_id: 1,
    technician: { id: 1, username: 'tecnico_joao', role: { id: 2, name: 'Técnico' } },
    status: 'resolvido',
    equipment_name: 'PDV 01',
    store_department: 'Loja 01',
    problem_description: 'Teclas numéricas falhando',
    symptoms: 'Não digita o número 5',
    diagnosis: 'Membrana danificada por líquido',
    cause: 'Café derramado',
    solution: 'Substituído por teclado reserva do estoque',
    commands_used: null,
    internal_notes: 'Teclado antigo descartado',
    knowledge_article_id: 15,
    notes: [],
    created_at: '2026-09-24T09:00:00Z',
    updated_at: '2026-09-24T09:30:00Z',
  },
];

function renderAttendancePage(auth = mockUserAuth) {
  return render(
    <AuthContext.Provider value={auth}>
      <ToastProvider>
        <AttendancePage />
      </ToastProvider>
    </AuthContext.Provider>
  );
}

describe('AttendancePage (Phase 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });

    vi.mocked(attendanceService.getAttendances).mockResolvedValue(pageOf(mockAttendances));
    vi.mocked(attendanceService.getTemplates).mockResolvedValue([]);
    vi.mocked(attendanceService.getContext).mockResolvedValue({ same_ticket: [], equipment_history: [] });
    vi.mocked(attendanceService.getAttendance).mockImplementation(async (id: number) => mockAttendances.find((a) => a.id === id)!);
    vi.mocked(attendanceService.convertToKnowledge).mockResolvedValue({
      id: 20,
      title: 'Procedimento: Falha Spooler de Impressão PDV 02',
      status: 'rascunho',
    });
    vi.mocked(attendanceService.addNote).mockResolvedValue({
      id: 11,
      attendance_id: 1,
      author_id: 1,
      author: { id: 1, username: 'tecnico_joao', role: { id: 2, name: 'Técnico' } },
      note: 'Nota de acompanhamento do chamado',
      created_at: '2026-09-24T10:30:00Z',
    });
    window.location.hash = '';
  });

  it('renders page header stating the OTRS boundary in one line', async () => {
    renderAttendancePage();

    expect(screen.getByText(/O chamado oficial continua no OTRS/)).toBeInTheDocument();
    expect(screen.getByText(/O chamado oficial continua no OTRS/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Falha Spooler de Impressão PDV 02')).toBeInTheDocument();
    });
  });

  it('displays attendances with OTRS ticket reference, status, and equipment', async () => {
    renderAttendancePage();

    await waitFor(() => {
      expect(screen.getByText('OTRS #202609240099')).toBeInTheDocument();
      expect(screen.getByText('PDV 02 - Caixa Central')).toBeInTheDocument();
      expect(screen.getAllByText(/Em Andamento/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Resolvido/i).length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByText('Falha Spooler de Impressão PDV 02'));

    await waitFor(() => {
      expect(screen.getByText('net stop spooler && net start spooler')).toBeInTheDocument();
    });
  });

  it('allows 1-click copy of commands used during attendance', async () => {
    renderAttendancePage();

    await waitFor(() => {
      expect(screen.getByText('Falha Spooler de Impressão PDV 02')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Falha Spooler de Impressão PDV 02'));

    const copyBtn = await screen.findByRole('button', { name: /copiar/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('net stop spooler && net start spooler');
      expect(screen.getByText('Copiado!')).toBeInTheDocument();
    });
  });

  it('converts attendance to knowledge draft and updates status', async () => {
    renderAttendancePage();

    await waitFor(() => {
      expect(screen.getByText('Falha Spooler de Impressão PDV 02')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Falha Spooler de Impressão PDV 02'));

    const convertBtn = await screen.findByRole('button', { name: /gerar artigo/i });
    fireEvent.click(convertBtn);

    await waitFor(() => {
      expect(attendanceService.convertToKnowledge).toHaveBeenCalledWith(1);
      expect(screen.getAllByText(/Artigo Criado/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens technical notes modal, displays existing notes, and submits new note', async () => {
    renderAttendancePage();

    await waitFor(() => {
      expect(screen.getByText('Falha Spooler de Impressão PDV 02')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Falha Spooler de Impressão PDV 02'));

    const notesTab = await screen.findByRole('tab', { name: /Notas & Anexos/i });
    fireEvent.click(notesTab);

    expect(await screen.findByText('Primeiro teste realizado com sucesso')).toBeInTheDocument();

    const noteInput = screen.getByPlaceholderText(/Registre observações sobre testes/i);
    fireEvent.change(noteInput, { target: { value: 'Nota de acompanhamento do chamado' } });

    const sendBtn = screen.getByRole('button', { name: /enviar nota/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(attendanceService.addNote).toHaveBeenCalledWith(1, 'Nota de acompanhamento do chamado');
    });
  });

  it('opens and closes new attendance modal', async () => {
    renderAttendancePage();

    const newBtn = screen.getByRole('button', { name: /novo atendimento/i });
    fireEvent.click(newBtn);

    expect(await screen.findByRole('heading', { name: 'Novo atendimento' })).toBeInTheDocument();
    expect(screen.getByText('Título *')).toBeInTheDocument();
    // Campos que existiam no banco mas não podiam ser preenchidos (P-20)
    expect(screen.getByText('Link do chamado')).toBeInTheDocument();
    expect(screen.getByText('Problema relatado')).toBeInTheDocument();
    expect(screen.getByText('Sintomas observados')).toBeInTheDocument();
    expect(screen.getByText('Observações só para a equipe')).toBeInTheDocument();
    expect(screen.getByLabelText('Equipamento')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Novo atendimento' })).not.toBeInTheDocument();
    });
  });

  it('opens new attendance modal with locked project context from hash url', async () => {
    // Set hash simulating click from ProjectWorkspace
    window.location.hash = '#attendance?new=true&project_id=42&project_name=Projeto%20Loja%20Shopping';

    renderAttendancePage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Novo atendimento' })).toBeInTheDocument();
    });

    // Check project read-only display
    expect(screen.getByText('Projeto Loja Shopping')).toBeInTheDocument();
    expect(screen.getByText('Vinculado')).toBeInTheDocument();

    // Verify hash was cleanly reset to #attendance
    expect(window.location.hash).toBe('#attendance');
  });
});

