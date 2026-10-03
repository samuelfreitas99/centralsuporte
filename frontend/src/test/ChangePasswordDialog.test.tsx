import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChangePasswordDialog } from '@/components/users/ChangePasswordDialog';
import { userService } from '@/services/userService';

vi.mock('@/services/userService', () => ({ userService: { changeMyPassword: vi.fn() } }));

const fill = (current: string, next: string, confirm: string) => {
  fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Confirme a nova senha'), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
};

describe('ChangePasswordDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates length and confirmation before calling the API', () => {
    render(<ChangePasswordDialog open onOpenChange={vi.fn()} />);
    fill('atual123', 'curta', 'curta');
    expect(screen.getByRole('alert')).toHaveTextContent(/pelo menos 8/);
    fill('atual123', 'novaSenha1', 'outraSenha1');
    expect(screen.getByRole('alert')).toHaveTextContent(/não confere/);
    expect(userService.changeMyPassword).not.toHaveBeenCalled();
  });

  it('changes the password and closes', async () => {
    vi.mocked(userService.changeMyPassword).mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(<ChangePasswordDialog open onOpenChange={onOpenChange} />);
    fill('atual123', 'novaSenha1', 'novaSenha1');
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(userService.changeMyPassword).toHaveBeenCalledWith('atual123', 'novaSenha1');
  });

  it('shows the server error (e.g. wrong current password)', async () => {
    vi.mocked(userService.changeMyPassword).mockRejectedValue(new Error('Senha atual incorreta'));
    render(<ChangePasswordDialog open onOpenChange={vi.fn()} />);
    fill('errada', 'novaSenha1', 'novaSenha1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha atual incorreta');
  });
});
