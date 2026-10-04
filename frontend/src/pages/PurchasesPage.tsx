import React, { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, Package, PackageCheck, Plus, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar, FilterSelect } from '@/components/ui/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { PurchaseFormDrawer } from '@/components/purchases/PurchaseFormDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { formatDate } from '@/lib/format';
import { statusOptions } from '@/lib/status';
import { purchaseService } from '@/services/purchaseService';
import type { PurchaseRequest, PurchaseRequestInput } from '@/types/purchases';

const money = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const readHashParam = (name: string) => new URLSearchParams(window.location.hash.split('?')[1] || '').get(name) || '';

/** Compras do setor: pedido com orçamentos → aprovação do gestor → recebimento (entra no estoque). */
export const PurchasesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();
  const canWrite = hasPermission('purchase:write');

  const [items, setItems] = useState<PurchaseRequest[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => readHashParam('status') || 'all');
  const [selectedId, setSelectedId] = useState<number | null>(() => Number(readHashParam('id')) || null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseRequest | null>(null);
  const [chosenQuote, setChosenQuote] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(
        await purchaseService.list({
          search: search || undefined,
          status_filter: statusFilter !== 'all' ? statusFilter : undefined,
        })
      );
    } catch (err) {
      toastError('Erro ao carregar compras', err instanceof Error ? err.message : '');
      setItems([]);
    }
  }, [search, statusFilter, toastError]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await load();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const selected = items?.find((p) => p.id === selectedId) ?? null;

  const select = (p: PurchaseRequest | null) => {
    setSelectedId(p?.id ?? null);
    setChosenQuote(p?.quotes[0]?.id ?? null); // mais barato vem primeiro
    setNote('');
  };

  const act = async (fn: () => Promise<PurchaseRequest>, message: string) => {
    setBusy(true);
    try {
      const updated = await fn();
      success(message, updated.title);
      await load();
    } catch (err) {
      toastError('Não foi possível concluir', err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  const save = async (data: PurchaseRequestInput) => {
    if (editing) {
      await purchaseService.update(editing.id, data);
      success('Pedido atualizado', data.title);
    } else {
      const created = await purchaseService.create(data);
      success('Pedido enviado para aprovação', created.title);
      setSelectedId(created.id);
    }
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={ShoppingCart} title="Compras" description="Peça o que o setor precisa com os orçamentos levantados. O gestor aprova e, ao receber, o item entra no estoque.">
        {canWrite && (
          <Button
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo pedido
          </Button>
        )}
      </PageHeader>

      <FilterBar search={search} onSearch={setSearch} placeholder="Buscar pedido...">
        <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions('purchase')} />
      </FilterBar>

      {items === null ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={search || statusFilter !== 'all' ? 'Nenhum pedido com esses filtros.' : 'Nenhum pedido de compra ainda.'}
          description="Ex.: reposição de mouses, um switch novo para a loja, cabos para um projeto."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card lg:col-span-2">
            {items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => select(p)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/40 ${p.id === selectedId ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{p.title}</p>
                    <StatusBadge domain="purchase" status={p.status} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.quantity}x · {money(p.chosen_total ?? p.best_total)} · {p.requester?.full_name || p.requester?.username} · {formatDate(p.created_at)}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div className="lg:col-span-3">
            {!selected ? (
              <p className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">Selecione um pedido para ver os orçamentos.</p>
            ) : (
              <section className="space-y-4 rounded-xl border border-border/60 bg-card p-5" aria-label="Detalhe do pedido">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selected.quantity}x {selected.title}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Pedido #{selected.id} por {selected.requester?.full_name || selected.requester?.username} em {formatDate(selected.created_at)}
                    </p>
                  </div>
                  <StatusBadge domain="purchase" status={selected.status} />
                </div>
                {selected.reason && <p className="whitespace-pre-wrap text-sm">{selected.reason}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {selected.stock_item_name && (
                    <span className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" /> Entra no estoque: {selected.stock_item_name}
                    </span>
                  )}
                  {selected.project_title && selected.project_id && (
                    <a href={`#projects?id=${selected.project_id}`} className="hover:text-primary hover:underline">
                      Projeto: {selected.project_title}
                    </a>
                  )}
                </div>

                <fieldset className="space-y-2">
                  <legend className="mb-1 text-xs font-semibold">Orçamentos</legend>
                  {selected.quotes.map((q, i) => {
                    const isChosen = selected.chosen_quote_id === q.id;
                    return (
                      <label
                        key={q.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${isChosen ? 'border-success/50 bg-success/5' : 'border-border/60'} ${selected.can_decide ? 'cursor-pointer' : ''}`}
                      >
                        {selected.can_decide && (
                          <input type="radio" name="quote" className="mt-1" checked={chosenQuote === q.id} onChange={() => setChosenQuote(q.id)} />
                        )}
                        <span className="flex-1">
                          <span className="flex flex-wrap items-center gap-2 font-medium">
                            {q.supplier}
                            {i === 0 && selected.quotes.length > 1 && <span className="rounded bg-success/15 px-1.5 text-[10px] text-success">mais barato</span>}
                            {isChosen && <span className="rounded bg-success/15 px-1.5 text-[10px] text-success">escolhido</span>}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {money(q.unit_price)} un. · total {money(q.total)}
                            {q.delivery_days != null && ` · ${q.delivery_days} dia(s)`}
                          </span>
                          {q.link &&
                            (/^https?:\/\//.test(q.link) ? (
                              <a href={q.link} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                <ExternalLink className="h-3 w-3" /> ver oferta
                              </a>
                            ) : (
                              <span className="block text-xs text-muted-foreground">{q.link}</span>
                            ))}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>

                {selected.decision_note && (
                  <p className="rounded-lg bg-muted/40 p-3 text-xs">
                    <span className="font-semibold">{selected.status === 'rejeitada' ? 'Motivo da rejeição' : 'Observação do gestor'}:</span> {selected.decision_note}
                    {selected.approver && ` — ${selected.approver.full_name || selected.approver.username}`}
                  </p>
                )}

                {selected.can_decide && (
                  <div className="space-y-2 border-t border-border/60 pt-4">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Observação (obrigatória para rejeitar)"
                      className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        className="gap-1.5"
                        disabled={busy || !note.trim()}
                        onClick={() => act(() => purchaseService.reject(selected.id, note), 'Compra rejeitada')}
                      >
                        <X className="h-4 w-4" /> Rejeitar
                      </Button>
                      <Button
                        className="gap-1.5"
                        disabled={busy || !chosenQuote}
                        onClick={() => chosenQuote && act(() => purchaseService.approve(selected.id, chosenQuote, note || undefined), 'Compra aprovada')}
                      >
                        <Check className="h-4 w-4" /> Aprovar orçamento escolhido
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  {selected.can_edit && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing(selected);
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                  )}
                  {canWrite && (selected.status === 'aguardando_aprovacao' || selected.status === 'aprovada') && (
                    <Button
                      variant="ghost"
                      className="text-destructive"
                      disabled={busy}
                      onClick={async () => {
                        if (await confirm({ title: 'Cancelar este pedido?', description: 'O pedido fica no histórico como cancelado.' })) {
                          act(() => purchaseService.cancel(selected.id), 'Pedido cancelado');
                        }
                      }}
                    >
                      Cancelar pedido
                    </Button>
                  )}
                  {canWrite && selected.status === 'aprovada' && (
                    <Button className="gap-1.5" disabled={busy} onClick={() => act(() => purchaseService.receive(selected.id), 'Recebimento registrado')}>
                      <PackageCheck className="h-4 w-4" /> Registrar recebimento
                    </Button>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      <PurchaseFormDrawer open={formOpen} onOpenChange={setFormOpen} purchase={editing} onSubmit={save} />
    </div>
  );
};
