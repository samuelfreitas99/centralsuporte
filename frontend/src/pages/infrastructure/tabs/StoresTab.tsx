import React, { useState } from 'react';
import { Building2, MapPin, Phone, Layers, Plus } from 'lucide-react';
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
import type { StoreItem, DepartmentItem, EquipmentItem } from '@/types/infrastructure';

export interface StoresTabProps {
  stores: StoreItem[];
  setStores: React.Dispatch<React.SetStateAction<StoreItem[]>>;
  departments: DepartmentItem[];
  setDepartments: React.Dispatch<React.SetStateAction<DepartmentItem[]>>;
  equipmentList: EquipmentItem[];
  searchQuery: string;
  isStoreModalOpen: boolean;
  setIsStoreModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const StoresTab: React.FC<StoresTabProps> = ({
  stores,
  setStores,
  departments,
  setDepartments,
  equipmentList,
  searchQuery,
  isStoreModalOpen,
  setIsStoreModalOpen,
}) => {
  const { showToast } = useToast();
  const addToast = (opts: { title: string; description?: string; type?: ToastType }) => {
    showToast(opts.title, { message: opts.description, type: opts.type });
  };

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [selectedStoreForDept, setSelectedStoreForDept] = useState<number | null>(null);

  const [storeForm, setStoreForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    status: 'ativa',
    notes: '',
  });

  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
  });

  const filteredStores = stores.filter((s) => {
    if (!searchQuery) return true;
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await infrastructureService.createStore(storeForm);
      setStores((prev) => [...prev, created]);
      setIsStoreModalOpen(false);
      setStoreForm({ name: '', code: '', address: '', phone: '', status: 'ativa', notes: '' });
      addToast({
        title: 'Loja Cadastrada',
        description: `Unidade ${created.name} cadastrada com sucesso.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar loja.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await infrastructureService.createDepartment({
        ...deptForm,
        store_id: selectedStoreForDept,
      });
      setDepartments((prev) => [...prev, created]);
      setIsDeptModalOpen(false);
      setDeptForm({ name: '', description: '' });
      addToast({
        title: 'Departamento Criado',
        description: `Setor ${created.name} adicionado.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar departamento.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  return (
    <>
      {filteredStores.length === 0 ? (
        <Card className="border-border/60 bg-card/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Nenhuma loja encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map((s) => {
            const storeDepts = departments.filter((d) => d.store_id === s.id);
            const storeEquipment = equipmentList.filter((e) => e.store_id === s.id);

            return (
              <Card key={s.id} className="border-border/80 bg-card/75 hover:border-blue-500/40 transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground font-heading">{s.name}</h3>
                        {s.code && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {s.code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-blue-400" />
                        <span>{s.address || 'Endereço não cadastrado'}</span>
                      </p>
                    </div>
                    <Badge variant={s.status === 'ativa' ? 'success' : 'destructive'} className="capitalize">
                      {s.status}
                    </Badge>
                  </div>

                  {s.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{s.phone}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-border/60 bg-background/50 p-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Equipamentos</span>
                      <span className="font-bold text-foreground text-sm">{storeEquipment.length}</span>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 p-2 text-center">
                      <span className="text-[10px] text-muted-foreground block">Departamentos</span>
                      <span className="font-bold text-foreground text-sm">{storeDepts.length}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>Setores Cadastrados</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStoreForDept(s.id);
                          setIsDeptModalOpen(true);
                        }}
                        className="h-6 px-1.5 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <span>Setor</span>
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {storeDepts.length > 0 ? (
                        storeDepts.map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1 text-[11px] bg-muted/40 border border-border/50 px-2 py-0.5 rounded-md text-foreground"
                          >
                            <span>{d.name}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Nenhum setor cadastrado</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE STORE */}
      <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveStore} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Building2 className="h-5 w-5 text-blue-400" />
                <span>Nova Loja / Unidade</span>
              </DialogTitle>
              <DialogDescription>Cadastre uma unidade operacional da empresa.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground mb-1 block">Nome da Unidade *</label>
                <Input
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  placeholder="Ex: Loja 04 - Shopping Centro"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Código da Unidade</label>
                  <Input
                    value={storeForm.code}
                    onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })}
                    placeholder="Ex: LJ-04"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Telefone</label>
                  <Input
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">Endereço</label>
                <Input
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  placeholder="Av. Paulista, 1000 - Bela Vista"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsStoreModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar Loja</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: CREATE DEPARTMENT */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveDept} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Layers className="h-5 w-5 text-blue-400" />
                <span>Novo Departamento / Setor</span>
              </DialogTitle>
              <DialogDescription>Cadastre um setor interno para a unidade.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground mb-1 block">Nome do Setor *</label>
                <Input
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="Ex: Frente de Caixa, Estoque, Gerência"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-foreground mb-1 block">Descrição</label>
                <Input
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Ex: PDVs fiscais e impressoras de cupom"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDeptModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar Setor</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
