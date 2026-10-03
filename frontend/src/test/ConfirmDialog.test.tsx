import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

const Probe = ({ onResult }: { onResult: (v: boolean) => void }) => {
  const confirm = useConfirm();
  return (
    <button onClick={async () => onResult(await confirm({ title: 'Excluir tarefa?', description: 'Checklists também.' }))}>
      apagar
    </button>
  );
};

describe('ConfirmDialog / useConfirm', () => {
  it('resolves true when the user confirms', async () => {
    const onResult = vi.fn();
    render(<ConfirmProvider><Probe onResult={onResult} /></ConfirmProvider>);

    fireEvent.click(screen.getByText('apagar'));
    expect(await screen.findByText('Excluir tarefa?')).toBeInTheDocument();
    expect(screen.getByText('Checklists também.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it('resolves false on cancel', async () => {
    const onResult = vi.fn();
    render(<ConfirmProvider><Probe onResult={onResult} /></ConfirmProvider>);

    fireEvent.click(screen.getByText('apagar'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it('falls back to the native dialog without a provider', async () => {
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onResult = vi.fn();
    render(<Probe onResult={onResult} />);
    fireEvent.click(screen.getByText('apagar'));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
