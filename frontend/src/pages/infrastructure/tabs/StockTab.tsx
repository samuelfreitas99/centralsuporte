import React, { useState, useMemo } from 'react';
import { formatDate, formatTime } from '@/lib/format';
import {
  Package,
  ShieldAlert,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Plus,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
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

  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

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

  console.log('STOCK TAB RENDER', { stockItemsLength: stockItems.length, filteredStockLength: filteredStock.length, searchQuery, lowStockFilter });

  const handleSaveStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStockId) {
        const { current_quantity, ...updatePayload } = stockForm;
        const updated = await infrastructureService.updateStockItem(editingStockId, updatePayload);
        setStockItems((prev) => prev.map((item) => (item.id === editingStockId ? updated : item)));
        if (selectedStock?.id === editingStockId) {
          setSelectedStock(updated);
        }
        addToast({ title: 'Item Atualizado', description: 'Cadastro atualizado com sucesso.', type: 'success' });
      } else {
        const created = await infrastructureService.createStockItem(stockForm);
        setStockItems((prev) => [...prev, created]);
        setSelectedStock(created);
        addToast({
          title: 'Item Cadastrado',
          description: `${created.name} adicionado ao controle operacional.`,
          type: 'success',
        });
      }
      setIsStockModalOpen(false);
      setEditingStockId(null);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar item de estoque.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleRegisterMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;
    setIsSubmittingMovement(true);
    try {
      const mov = await infrastructureService.registerStockMovement(selectedStock.id, movementForm);
      
      // Update local state by refetching this item to get the latest history and quantity
      const updatedItems = await infrastructureService.getStockItems({ q: selectedStock.name });
      const found = updatedItems.find((i) => i.id === selectedStock.id);
      
      if (found) {
        setStockItems((prev) => prev.map((item) => (item.id === found.id ? found : item)));
        setSelectedStock(found);
      }
      
      setMovementForm({ movement_type: 'entrada', quantity: 1, reason: '' });
      addToast({
        title: 'Movimentação Registrada',
        description: `${mov.movement_type.toUpperCase()}: ${mov.quantity} unidade(s).`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar movimentação.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-14rem)] min-h-[500px]">
        {/* LIST VIEW (Master) */}
        <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col border border-border/40 rounded-xl overflow-hidden bg-card/50 shadow-sm">
          <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Itens Operacionais
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingStockId(null);
                setStockForm({ name: '', category: 'perifericos', part_number: '', current_quantity: 0, min_quantity: 2, unit: 'unidade', location: '', notes: '' });
                setIsStockModalOpen(true);
              }}
              className="h-7 px-2 text-[11px] text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
            >
              <Plus className="h-3 w-3 mr-1" /> Novo Item
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {filteredStock.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-muted-foreground italic">
                Nenhum item encontrado.
              </div>
            ) : (
              <>
                {filteredStock.map((item) => {
                  const isLow = item.current_quantity <= item.min_quantity;
                  const isSelected = selectedStock?.id === item.id;
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedStock(item)}
                      className={`cursor-pointer rounded-lg border p-3 transition-all ${
                        isSelected 
                          ? 'border-blue-500/50 bg-blue-500/5 shadow-sm' 
                          : isLow 
                            ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50' 
                            : 'border-border/40 bg-background/50 hover:bg-muted/30 hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-3">
                          <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-400' : 'text-foreground'}`}>
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {item.location || 'Sem localização'} • {item.part_number || 'Sem código'}
                          </p>
                        </div>
                        <div className={`text-right shrink-0 flex flex-col items-end`}>
                          <div className={`text-lg font-bold font-mono leading-none ${isLow ? 'text-amber-500' : 'text-foreground'}`}>
                            {item.current_quantity}
                          </div>
                          {isLow && (
                            <span className="text-[9px] text-amber-500 font-bold uppercase mt-1">Crítico</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* DETAIL VIEW (Detail) */}
        <div className="w-full md:w-1/2 lg:w-3/5 flex flex-col border border-border/40 rounded-xl overflow-hidden bg-card/50 shadow-sm">
          {!selectedStock ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground border border-border/50">
                <Package className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-semibold text-foreground font-heading">
                Selecione um item
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Clique em um item na lista ao lado para ver o histórico de movimentações e lançar entradas ou saídas.
              </p>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="p-5 border-b border-border/40 bg-muted/10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-foreground">{selectedStock.name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingStockId(selectedStock.id);
                          setStockForm({
                            name: selectedStock.name,
                            category: selectedStock.category || 'perifericos',
                            part_number: selectedStock.part_number || '',
                            current_quantity: selectedStock.current_quantity,
                            min_quantity: selectedStock.min_quantity || 2,
                            unit: selectedStock.unit || 'unidade',
                            location: selectedStock.location || '',
                            notes: selectedStock.notes || '',
                          });
                          setIsStockModalOpen(true);
                        }}
                        className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Editar Cadastro
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      P/N: {selectedStock.part_number || 'Sem código'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">Saldo Atual</span>
                    <span className={`text-3xl font-bold font-mono leading-none ${selectedStock.current_quantity <= selectedStock.min_quantity ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {selectedStock.current_quantity}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Layers className="h-3.5 w-3.5 text-blue-400" />
                    {selectedStock.location || 'Sem localização'}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500/70" />
                    Mínimo: {selectedStock.min_quantity}
                  </span>
                </div>
              </div>

              {/* Movement Action Bar */}
              <div className="p-4 border-b border-border/40 bg-background/50">
                <form onSubmit={handleRegisterMovement} className="flex items-end gap-3">
                  <div className="w-1/3">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Operação</label>
                    <select
                      value={movementForm.movement_type}
                      onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border/80 bg-background px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="entrada">Entrada (+)</option>
                      <option value="saida">Saída (-)</option>
                      <option value="transferencia">Transferência (-)</option>
                      <option value="devolucao">Devolução (+)</option>
                      <option value="baixa">Baixa (-)</option>
                    </select>
                  </div>
                  <div className="w-1/4">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Qtd</label>
                    <Input
                      type="number"
                      min={1}
                      value={movementForm.quantity}
                      onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                      required
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Motivo</label>
                    <Input
                      value={movementForm.reason || ''}
                      onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                      placeholder="Ex: Reforço Loja 02"
                      className="h-9 text-xs"
                      required={movementForm.movement_type !== 'entrada'}
                    />
                  </div>
                  <Button type="submit" disabled={isSubmittingMovement} size="sm" className="h-9 px-4 shrink-0 shadow-sm cursor-pointer">
                    Lançar
                  </Button>
                </form>
              </div>

              {/* History Timeline */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-background/30">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Últimas Movimentações
                </h4>
                
                <div className="space-y-4">
                  {selectedStock.movements && selectedStock.movements.length > 0 ? (
                    selectedStock.movements.map((mov) => {
                      const isPositive = ['entrada', 'devolucao'].includes(mov.movement_type);
                      return (
                        <div key={mov.id} className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isPositive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
                            {isPositive ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                {mov.movement_type} <span className="text-muted-foreground font-mono ml-1">({isPositive ? '+' : '-'}{mov.quantity})</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {formatDate(mov.created_at)} {formatTime(mov.created_at)}
                              </span>
                            </div>
                            {mov.reason && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {mov.reason}
                              </p>
                            )}
                            {mov.user && (
                              <p className="text-[10px] text-muted-foreground/60 mt-1">
                                Por: {mov.user.username}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground italic border border-dashed border-border/50 rounded-lg">
                      Nenhuma movimentação registrada no histórico.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* DRAWER: CREATE STOCK ITEM */}
      <Drawer open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DrawerContent size="default">
          <form onSubmit={handleSaveStockItem} className="flex flex-col h-full">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-400" />
                <span>{editingStockId ? 'Editar Item de Estoque' : 'Novo Item de Estoque Operacional'}</span>
              </DrawerTitle>
              <DrawerDescription>{editingStockId ? 'Altere os metadados do cadastro.' : 'Controle de suprimentos rápidos e materiais sob custódia do suporte.'}</DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Nome do Material *</label>
                <Input
                  value={stockForm.name}
                  onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                  placeholder="Ex: Toner HP Laser 85A ou Patch Cord Cat6 2m"
                  className="bg-background/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Part Number / Código</label>
                  <Input
                    value={stockForm.part_number || ''}
                    onChange={(e) => setStockForm({ ...stockForm, part_number: e.target.value })}
                    placeholder="Ex: CE285A"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Categoria</label>
                  <select
                    value={stockForm.category}
                    onChange={(e) => setStockForm({ ...stockForm, category: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/50 px-3 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="perifericos">Periféricos (Mouse/Teclado)</option>
                    <option value="suprimentos">Suprimentos (Toner/Papel)</option>
                    <option value="redes">Redes & Cabos</option>
                    <option value="pecas">Peças & Componentes</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Estoque Inicial</label>
                  <Input
                    type="number"
                    min={0}
                    value={stockForm.current_quantity}
                    onChange={(e) => setStockForm({ ...stockForm, current_quantity: Number(e.target.value) })}
                    disabled={!!editingStockId}
                    className="bg-background/50"
                  />
                  {editingStockId && <span className="text-[10px] text-muted-foreground mt-1 block">Saldo é controlado por movimentações.</span>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Estoque Mínimo (Alerta)</label>
                  <Input
                    type="number"
                    min={1}
                    value={stockForm.min_quantity}
                    onChange={(e) => setStockForm({ ...stockForm, min_quantity: Number(e.target.value) })}
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Localização / Armário</label>
                <Input
                  value={stockForm.location || ''}
                  onChange={(e) => setStockForm({ ...stockForm, location: e.target.value })}
                  placeholder="Ex: Armário TI - Prateleira 2"
                  className="bg-background/50"
                />
              </div>
            </div>

            <DrawerFooter>
              <Button type="button" variant="outline" onClick={() => { setIsStockModalOpen(false); setEditingStockId(null); }}>Cancelar</Button>
              <Button type="submit">{editingStockId ? 'Salvar Alterações' : 'Cadastrar Item'}</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
};
