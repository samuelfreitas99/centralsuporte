import React, { useEffect, useState } from 'react';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ProjectSelect } from '@/components/projects/ProjectSelect';
import { infrastructureService } from '@/services/infrastructureService';
import type { StockItem } from '@/types/infrastructure';
import type { PurchaseQuoteInput, PurchaseRequest, PurchaseRequestInput } from '@/types/purchases';

interface PurchaseFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: PurchaseRequest | null;
  onSubmit: (data: PurchaseRequestInput) => Promise<void>;
}

const EMPTY_QUOTE: PurchaseQuoteInput = { supplier: '', unit_price: 0, delivery_days: null, link: '' };

export const PurchaseFormDrawer: React.FC<PurchaseFormDrawerProps> = ({ open, onOpenChange, purchase, onSubmit }) => {
  const [form, setForm] = useState<PurchaseRequestInput>({ title: '', quantity: 1, reason: '', quotes: [EMPTY_QUOTE] });
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reinicia ao abrir (novo ou edição).
  const key = `${open}-${purchase?.id ?? 'novo'}`;
  const [lastKey, setLastKey] = useState('');
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setForm(
        purchase
          ? {
              title: purchase.title,
              reason: purchase.reason ?? '',
              quantity: purchase.quantity,
              stock_item_id: purchase.stock_item_id ?? null,
              project_id: purchase.project_id ?? null,
              quotes: purchase.quotes.map(({ supplier, unit_price, delivery_days, link, notes }) => ({
                supplier,
                unit_price,
                delivery_days,
                link,
                notes,
              })),
            }
          : { title: '', quantity: 1, reason: '', quotes: [{ ...EMPTY_QUOTE }] }
      );
      setError(null);
    }
  }

  useEffect(() => {
    if (!open || stockItems.length) return;
    let cancelled = false;
    infrastructureService
      .getStockItems()
      .then((items) => !cancelled && setStockItems(items))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, stockItems.length]);

  const setQuote = (i: number, patch: Partial<PurchaseQuoteInput>) =>
    setForm((f) => ({ ...f, quotes: f.quotes.map((q, idx) => (idx === i ? { ...q, ...patch } : q)) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quotes = form.quotes.filter((q) => q.supplier.trim());
    if (!quotes.length) return setError('Inclua pelo menos um orçamento (fornecedor e preço).');
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...form, quotes });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="lg" className="flex h-full flex-col p-0">
        <DrawerHeader className="border-b border-border/60 px-6 py-5">
          <DrawerTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {purchase ? 'Editar pedido de compra' : 'Novo pedido de compra'}
          </DrawerTitle>
          <DrawerDescription>Inclua os orçamentos que você levantou. O gestor escolhe um e aprova.</DrawerDescription>
        </DrawerHeader>

        <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <label className="space-y-1.5 sm:col-span-3">
                <span className="text-xs font-semibold">O que comprar *</span>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Mouse USB" required />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold">Quantidade *</span>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value) || 1) })} />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">Por que precisamos</span>
              <textarea
                value={form.reason ?? ''}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={2}
                placeholder="Ex.: estoque zerado, 3 lojas pediram reposição"
                className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold">Item de estoque</span>
                <select
                  value={form.stock_item_id ?? ''}
                  onChange={(e) => setForm({ ...form, stock_item_id: e.target.value ? Number(e.target.value) : null })}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Não entra no estoque</option>
                  {stockItems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (tem {s.current_quantity})
                    </option>
                  ))}
                </select>
                <span className="block text-[11px] text-muted-foreground">Ao registrar o recebimento, a quantidade entra no estoque.</span>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold">Projeto (opcional)</span>
                <ProjectSelect value={form.project_id ?? null} onChange={(id) => setForm({ ...form, project_id: id || null })} />
              </label>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold">Orçamentos *</legend>
              {form.quotes.map((q, i) => (
                <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border/60 p-3">
                  <label className="col-span-12 space-y-1 sm:col-span-5">
                    <span className="text-[11px] text-muted-foreground">Fornecedor</span>
                    <Input value={q.supplier} onChange={(e) => setQuote(i, { supplier: e.target.value })} />
                  </label>
                  <label className="col-span-5 space-y-1 sm:col-span-3">
                    <span className="text-[11px] text-muted-foreground">Preço unitário (R$)</span>
                    <Input type="number" min={0} step="0.01" value={q.unit_price} onChange={(e) => setQuote(i, { unit_price: Number(e.target.value) || 0 })} />
                  </label>
                  <label className="col-span-5 space-y-1 sm:col-span-3">
                    <span className="text-[11px] text-muted-foreground">Prazo (dias)</span>
                    <Input type="number" min={0} value={q.delivery_days ?? ''} onChange={(e) => setQuote(i, { delivery_days: e.target.value ? Number(e.target.value) : null })} />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="col-span-2 sm:col-span-1"
                    disabled={form.quotes.length === 1}
                    onClick={() => setForm((f) => ({ ...f, quotes: f.quotes.filter((_, idx) => idx !== i) }))}
                    aria-label="Remover orçamento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <label className="col-span-12 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Link ou observação</span>
                    <Input value={q.link ?? ''} onChange={(e) => setQuote(i, { link: e.target.value })} placeholder="https://loja... ou contato do vendedor" />
                  </label>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setForm((f) => ({ ...f, quotes: [...f.quotes, { ...EMPTY_QUOTE }] }))}>
                <Plus className="h-4 w-4" /> Outro orçamento
              </Button>
            </fieldset>
            {error && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
          <DrawerFooter className="flex flex-row justify-end gap-2 border-t border-border/60 p-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enviando...' : purchase ? 'Salvar' : 'Enviar para aprovação'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};
