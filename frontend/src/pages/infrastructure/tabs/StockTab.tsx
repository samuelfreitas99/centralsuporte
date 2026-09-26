import React, { useState, useMemo } from 'react';
import { Package, ShieldAlert, Layers, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast, type ToastType } from '@/components/ui/Toast';
import { infrastructureService } from '@/services/infrastructureService';
import type { StockItem, StockItemCreatePayload, StockMovementCreatePayload } from '@/types/infrastructure';

export interface StockTabProps {
  stockItems: StockItem[];
  setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
  searchQuery: string;
  lowStockFilter: boolean;
  isStockModalOpen: boolean;
  setIsStockModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const StockTab: React.FC<StockTabProps> = ({
  stockItems,
  setStockItems,
  searchQuery,
  lowStockFilter,
  isStockModalOpen,
  setIsStockModalOpen,
}) => {
  const { showToast } = useToast();
  const addToast = (opts: { title: string; description?: string; type?: ToastType }) => {
    showToast(opts.title, { message: opts.description, type: opts.type });
  };

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedStockForMovement, setSelectedStockForMovement] = useState<StockItem | null>(null);

  const [stockForm, setStockForm] = useState<StockItemCreatePayload>({
    name: '',
    category: 'perifericos',
    part_number: '',
    current_quantity: 0,
    min_quantity: 2,
    unit: 'unidade',
    location: '',
    notes: '',
  });

  const [movementForm, setMovementForm] = useState<StockMovementCreatePayload>({
    movement_type: 'entrada',
    quantity: 1,
    reason: '',
  });

  const filteredStock = useMemo(() => {
    return stockItems.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.part_number && item.part_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLowStock = !lowStockFilter || item.is_low_stock;
      return matchesSearch && matchesLowStock;
    });
  }, [stockItems, searchQuery, lowStockFilter]);

  const handleSaveStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await infrastructureService.createStockItem(stockForm);
      setStockItems((prev) => [...prev, created]);
      setIsStockModalOpen(false);
      setStockForm({
        name: '',
        category: 'perifericos',
        part_number: '',
        current_quantity: 0,
        min_quantity: 2,
        unit: 'unidade',
        location: '',
        notes: '',
      });
      addToast({
        title: 'Item de Estoque Cadastrado',
        description: `${created.name} adicionado ao controle operacional.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar item de estoque.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleRegisterMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockForMovement) return;
    try {
      const mov = await infrastructureService.registerStockMovement(selectedStockForMovement.id, movementForm);
      const updatedItem = await infrastructureService.getStockItems({ q: selectedStockForMovement.name });
      const found = updatedItem.find((i) => i.id === selectedStockForMovement.id);
      if (found) {
        setStockItems((prev) => prev.map((item) => (item.id === found.id ? found : item)));
      }
      setIsMovementModalOpen(false);
      setMovementForm({ movement_type: 'entrada', quantity: 1, reason: '' });
      addToast({
        title: 'Movimentação Registrada',
        description: `${mov.movement_type.toUpperCase()}: ${mov.quantity} unidade(s) processadas.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar movimentação de estoque.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  return (
    <>
      {filteredStock.length === 0 ? (
        <Card className="border-border/60 bg-card/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Nenhum item de estoque encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStock.map((item) => {
            const isLow = item.current_quantity <= item.min_quantity;
            return (
              <Card
                key={item.id}
                className={`border-border/80 bg-card/75 transition-all ${
                  isLow ? 'border-amber-500/40 shadow-sm shadow-amber-500/10' : ''
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground font-heading">{item.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        P/N: {item.part_number || 'Sem código'}
                      </p>
                    </div>
                    {isLow ? (
                      <Badge variant="warning" className="flex items-center gap-1 text-[11px]">
                        <ShieldAlert className="h-3 w-3" />
                        <span>Estoque Crítico</span>
                      </Badge>
                    ) : (
                      <Badge variant="success">Disponível</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-background/50 p-3 text-center">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">Saldo Atual</span>
                      <span className={`text-2xl font-bold font-mono ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {item.current_quantity}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">{item.unit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">Estoque Mínimo</span>
                      <span className="text-2xl font-bold font-mono text-muted-foreground">{item.min_quantity}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">{item.unit}</span>
                    </div>
                  </div>

                  {item.location && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-blue-400" />
                      <span>Local: {item.location}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground capitalize">Categoria: {item.category}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedStockForMovement(item);
                        setIsMovementModalOpen(true);
                      }}
                      className="h-8 text-xs flex items-center gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span>Movimentar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE STOCK ITEM */}
      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveStockItem} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Package className="h-5 w-5 text-blue-400" />
                <span>Novo Item de Estoque Operacional</span>
              </DialogTitle>
              <DialogDescription>Controle de suprimentos rápidos e materiais sob custódia do suporte.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground mb-1 block">Nome do Material *</label>
                <Input
                  value={stockForm.name}
                  onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                  placeholder="Ex: Toner HP Laser 85A ou Patch Cord Cat6 2m"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Part Number / Código</label>
                  <Input
                    value={stockForm.part_number || ''}
                    onChange={(e) => setStockForm({ ...stockForm, part_number: e.target.value })}
                    placeholder="Ex: CE285A"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Categoria</label>
                  <select
                    value={stockForm.category}
                    onChange={(e) => setStockForm({ ...stockForm, category: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="perifericos">Periféricos (Mouse/Teclado)</option>
                    <option value="suprimentos">Suprimentos (Toner/Papel)</option>
                    <option value="redes">Redes & Cabos</option>
                    <option value="pecas">Peças & Componentes</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Estoque Inicial</label>
                  <Input
                    type="number"
                    min={0}
                    value={stockForm.current_quantity}
                    onChange={(e) => setStockForm({ ...stockForm, current_quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Estoque Mínimo (Alerta)</label>
                  <Input
                    type="number"
                    min={1}
                    value={stockForm.min_quantity}
                    onChange={(e) => setStockForm({ ...stockForm, min_quantity: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">Localização / Armário</label>
                <Input
                  value={stockForm.location || ''}
                  onChange={(e) => setStockForm({ ...stockForm, location: e.target.value })}
                  placeholder="Ex: Armário TI - Prateleira 2"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsStockModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: REGISTER STOCK MOVEMENT */}
      <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRegisterMovement} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <ArrowUpRight className="h-5 w-5 text-blue-400" />
                <span>Movimentar Estoque: {selectedStockForMovement?.name}</span>
              </DialogTitle>
              <DialogDescription>
                Saldo atual: {selectedStockForMovement?.current_quantity} {selectedStockForMovement?.unit}(s).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Tipo de Movimentação</label>
                  <select
                    value={movementForm.movement_type}
                    onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="entrada">Entrada (+)</option>
                    <option value="saida">Saída (-)</option>
                    <option value="baixa">Baixa / Descarte (-)</option>
                    <option value="transferencia">Transferência (-)</option>
                    <option value="devolucao">Devolução (+)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Quantidade *</label>
                  <Input
                    type="number"
                    min={1}
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">Motivo / Destino / Observação</label>
                <Input
                  value={movementForm.reason || ''}
                  onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                  placeholder="Ex: Entregue para reposição na Loja 02"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsMovementModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Processar Movimentação</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
