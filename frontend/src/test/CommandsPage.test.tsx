import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommandsPage } from '@/pages/CommandsPage';
import { AuthContext } from '@/context/AuthContextDef';
import { ToastProvider } from '@/components/ui/Toast';
import { commandService } from '@/services/commandService';
import { responseService } from '@/services/responseService';
import type { AuthContextType } from '@/types/auth';
import type { CommandItem, StandardResponseItem } from '@/types/commands';

vi.mock('@/services/commandService');
vi.mock('@/services/responseService');

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

const mockCommands: CommandItem[] = [
  {
    id: 1,
    title: 'Reiniciar Placa de Rede DHCP',
    description: 'Libera e renova concessão de IP',
    command: 'ipconfig /release && ipconfig /renew',
    system: 'Windows',
    category: 'Redes',
    tags: 'dhcp, ip, rede',
    notes: 'Executar via prompt com privilégio padrão',
    warning: 'Causa perda de conectividade momentânea por 5s',
    visibility: 'equipe',
    author_id: 1,
    author: { id: 1, username: 'tecnico_joao', role: { id: 2, name: 'Técnico' } },
    copies_count: 5,
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
    steps: [{ id: 1, command_id: 1, position: 1, title: 'Passo 1', command_text: 'ipconfig /release && ipconfig /renew' }]
  },
  {
    id: 2,
    title: 'Reiniciar Serviço Docker',
    description: 'Reinicia o daemon do Docker',
    command: 'sudo systemctl restart docker',
    system: 'Linux',
    category: 'Servidores',
    tags: 'docker, linux',
    notes: 'Necessário sudo',
    warning: 'Derruba containers ativos',
    visibility: 'equipe',
    author_id: 2,
    author: { id: 2, username: 'admin', role: { id: 1, name: 'Administrador' } },
    copies_count: 12,
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
    steps: [{ id: 2, command_id: 2, position: 1, title: 'Passo 1', command_text: 'sudo systemctl restart docker' }]
  },
];

const mockResponses: StandardResponseItem[] = [
  {
    id: 1,
    title: 'Instrução de Reinício de Roteador',
    content: 'Olá! Por favor, desligue o roteador da tomada por 30 segundos e ligue novamente.',
    category: 'Atendimento',
    audience: 'usuario_final',
    tags: 'roteador, internet',
    visibility: 'equipe',
    author_id: 1,
    author: { id: 1, username: 'tecnico_joao', role: { id: 2, name: 'Técnico' } },
    copies_count: 8,
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
  },
];

function renderCommandsPage(auth = mockUserAuth) {
  return render(
    <AuthContext.Provider value={auth}>
      <ToastProvider>
        <CommandsPage />
      </ToastProvider>
    </AuthContext.Provider>
  );
}

describe('CommandsPage (Phase 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock clipboard safely
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
    
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true,
    });

    vi.mocked(commandService.getCommands).mockResolvedValue(mockCommands);
    vi.mocked(commandService.getSystems).mockResolvedValue(['Windows', 'Linux']);
    vi.mocked(commandService.getCategories).mockResolvedValue(['Redes', 'Servidores']);
    vi.mocked(commandService.copyCommand).mockResolvedValue({ status: 'ok', copies_count: 6 });

    vi.mocked(responseService.getResponses).mockResolvedValue(mockResponses);
    vi.mocked(responseService.getCategories).mockResolvedValue(['Atendimento']);
    vi.mocked(responseService.getAudiences).mockResolvedValue(['usuario_final']);
    vi.mocked(responseService.copyResponse).mockResolvedValue({ status: 'ok', copies_count: 9 });
  });

  it('renders page header with title, subtitle, and tabs', async () => {
    renderCommandsPage();

    expect(screen.getByText('Repositório Operacional')).toBeInTheDocument();
    expect(screen.getByText(/biblioteca de comandos úteis de suporte/i)).toBeInTheDocument();
    expect(screen.getByText('Comandos Rápidos')).toBeInTheDocument();
    expect(screen.getByText('Respostas Padrão')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Reiniciar Placa de Rede DHCP')).toBeInTheDocument();
    });
  });

  it('displays commands cards with system badges, code block, and warning notices', async () => {
    renderCommandsPage();

    await waitFor(() => {
      expect(screen.getByText('Reiniciar Placa de Rede DHCP')).toBeInTheDocument();
      expect(screen.getByText('ipconfig /release && ipconfig /renew')).toBeInTheDocument();
      expect(screen.getByText(/causa perda de conectividade momentânea/i)).toBeInTheDocument();
      expect(screen.getByText('5 cópias')).toBeInTheDocument();
    });
  });

  it('allows 1-click copy of commands, updates copy count, and calls copy endpoint', async () => {
    renderCommandsPage();

    await waitFor(() => {
      expect(screen.getByText('Reiniciar Placa de Rede DHCP')).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByRole('button', { name: /copiar todos/i });
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ipconfig /release && ipconfig /renew');
      expect(commandService.copyCommand).toHaveBeenCalledWith(1);
      expect(screen.getByText('6 cópias')).toBeInTheDocument();
    });
  });

  it('switches to Standard Responses tab and displays response cards', async () => {
    renderCommandsPage();

    await waitFor(() => {
      expect(screen.getByText('Reiniciar Placa de Rede DHCP')).toBeInTheDocument();
    });

    const responsesTab = screen.getByRole('tab', { name: /respostas padrão/i });
    fireEvent.click(responsesTab);

    await waitFor(() => {
      expect(screen.getByText('Instrução de Reinício de Roteador')).toBeInTheDocument();
      expect(screen.getByText(/desligue o roteador da tomada/i)).toBeInTheDocument();
      expect(screen.getAllByText('Usuário Final').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('8 cópias')).toBeInTheDocument();
    });
  });

  it('allows 1-click copy of standard responses', async () => {
    renderCommandsPage();

    await waitFor(() => {
      expect(screen.getByText('Reiniciar Placa de Rede DHCP')).toBeInTheDocument();
    });

    const responsesTab = screen.getByRole('tab', { name: /respostas padrão/i });
    fireEvent.click(responsesTab);

    await waitFor(() => {
      expect(screen.getByText('Instrução de Reinício de Roteador')).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /copiar resposta/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'Olá! Por favor, desligue o roteador da tomada por 30 segundos e ligue novamente.'
      );
      expect(responseService.copyResponse).toHaveBeenCalledWith(1);
      expect(screen.getByText('9 cópias')).toBeInTheDocument();
    });
  });

  it('shows empty state when no commands match filters', async () => {
    vi.mocked(commandService.getCommands).mockResolvedValueOnce([]);

    renderCommandsPage();

    await waitFor(() => {
      expect(screen.getByText(/nenhum comando operacional encontrado/i)).toBeInTheDocument();
    });
  });

  it('opens and cancels create command dialog modal', async () => {
    renderCommandsPage();

    const newBtn = screen.getByRole('button', { name: /novo comando/i });
    fireEvent.click(newBtn);

    expect(screen.getByText(/cadastre comandos técnicos úteis/i)).toBeInTheDocument();
    expect(screen.getByText(/título do comando \*/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText(/cadastre comandos técnicos úteis/i)).not.toBeInTheDocument();
    });
  });
});
