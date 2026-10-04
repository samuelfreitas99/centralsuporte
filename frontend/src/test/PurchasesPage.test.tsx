import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PurchasesPage } from '@/pages/PurchasesPage';
import { purchaseService } from '@/services/purchaseService';
import type { PurchaseRequest } from '@/types/purchases';

vi.mock('@/services/purchaseService');
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const base: PurchaseRequest = {
  id: 3,
  title: 'Mouse USB',
  quantity: 10,
  status: 'aguardando_aprovacao',
  requester: { id: 1, username: 'ana', email: 'a@x', is_active: true, full_name: 'Ana' },
  quotes: [
    { id: 11, supplier: 'Loja B', unit_price: 42.5, total: 425, delivery_days: 3 },
    { id: 10, supplier: 'Loja A', unit_price: 50, total: 500 },
  ],
  best_total: 425,
  stock_item_name: 'Mouse',
  can_edit: true,
  can_decide: true,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
};

describe('PurchasesPage (Compras)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(purchaseService.list).mockResolvedValue([base]);
    vi.mocked(purchaseService.approve).mockResolvedValue({ ...base, status: 'aprovada', chosen_quote_id: 11 });
  });

  it('approves the cheapest quote by default', async () => {
    render(<PurchasesPage />);
    fireEvent.click(await screen.findByText('Mouse USB'));
    expect(screen.getByText('mais barato')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aprovar orçamento/ }));
    await waitFor(() => expect(purchaseService.approve).toHaveBeenCalledWith(3, 11, undefined));
  });

  it('requires a reason to reject', async () => {
    render(<PurchasesPage />);
    fireEvent.click(await screen.findByText('Mouse USB'));
    const reject = screen.getByRole('button', { name: /Rejeitar/ });
    expect(reject).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/obrigatória para rejeitar/), { target: { value: 'Sem verba' } });
    expect(reject).toBeEnabled();
  });

  it('offers receiving only for approved requests', async () => {
    vi.mocked(purchaseService.list).mockResolvedValue([{ ...base, status: 'aprovada', can_decide: false, can_edit: false, chosen_quote_id: 11 }]);
    render(<PurchasesPage />);
    fireEvent.click(await screen.findByText('Mouse USB'));
    expect(screen.getByRole('button', { name: /Registrar recebimento/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprovar/ })).not.toBeInTheDocument();
  });
});
