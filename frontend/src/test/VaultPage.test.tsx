import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VaultPage } from '@/pages/VaultPage';
import { vaultService } from '@/services/vaultService';
import { copyToClipboard } from '@/lib/clipboard';
import type { VaultEntry } from '@/types/vault';

vi.mock('@/services/vaultService');
vi.mock('@/lib/clipboard', () => ({ copyToClipboard: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ hasPermission: () => true }) }));
const success = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ success, error: vi.fn() }) }));

const entry: VaultEntry = {
  id: 7,
  title: 'Switch core - Matriz',
  system_url: 'ssh 10.0.0.2',
  category: 'Rede',
  visibility: 'equipe',
  owner_id: 1,
  owner: { id: 1, username: 'ana', email: 'a@x', is_active: true, full_name: 'Ana' },
  can_edit: true,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-02T10:00:00Z',
};

describe('VaultPage (Senhas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vaultService.status).mockResolvedValue({ configured: true });
    vi.mocked(vaultService.list).mockResolvedValue([entry]);
    vi.mocked(vaultService.reveal).mockResolvedValue({ username: 'admin', password: 'S3nh@!', notes: null });
  });

  it('lists credentials without any secret on screen', async () => {
    render(<VaultPage />);
    expect(await screen.findByText('Switch core - Matriz')).toBeInTheDocument();
    expect(screen.queryByText('S3nh@!')).not.toBeInTheDocument();
    expect(vaultService.reveal).not.toHaveBeenCalled();
  });

  it('copies the password through the audited reveal endpoint', async () => {
    render(<VaultPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Senha/ }));
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith('S3nh@!'));
    expect(vaultService.reveal).toHaveBeenCalledWith(7);
    expect(success).toHaveBeenCalledWith('Senha copiada', expect.stringMatching(/auditoria/));
  });

  it('shows the secret on demand and hides it again', async () => {
    render(<VaultPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar' }));
    expect(await screen.findByText('S3nh@!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(screen.queryByText('S3nh@!')).not.toBeInTheDocument();
  });

  it('warns when the server has no vault key', async () => {
    vi.mocked(vaultService.status).mockResolvedValue({ configured: false });
    render(<VaultPage />);
    expect(await screen.findByText(/ainda não foi configurado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nova senha/ })).not.toBeInTheDocument();
  });
});
