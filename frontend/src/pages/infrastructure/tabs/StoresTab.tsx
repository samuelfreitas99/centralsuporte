import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  MapPin,
  Phone,
  Layers,
  Plus,
  Server,
  Camera,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { AttachmentManager } from '@/components/attachments/AttachmentManager';
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
  
  // Drawer state for viewing a specific Department / Rack
  const [selectedDeptDrawer, setSelectedDeptDrawer] = useState<DepartmentItem | null>(null);

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
        <Card className="border-border/60 bg-card/40 border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Nenhuma loja encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredStores.map((s) => {
              const storeDepts = departments.filter((d) => d.store_id === s.id);
              const storeEquipment = equipmentList.filter((e) => e.store_id === s.id);

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-border/60 shadow-sm bg-card/50 flex flex-col h-full overflow-hidden">
                    <CardContent className="p-0 flex flex-col h-full">
                      {/* Store Header */}
                      <div className="p-5 border-b border-border/40 bg-muted/20">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <h3 className="text-base font-bold text-foreground">{s.name}</h3>
                              {s.code && (
                                <Badge variant="outline" className="font-mono text-[10px] py-0 border-border/80 text-muted-foreground">
                                  {s.code}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-primary/70" />
                                {s.address || 'Sem endereço'}
                              </span>
                              {s.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-primary/70" />
                                  {s.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant={s.status === 'ativa' ? 'outline' : 'destructive'} className="capitalize bg-background text-[10px]">
                            {s.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Store Departments / Racks */}
                      <div className="flex-1 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5" /> Setores / Locais
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStoreForDept(s.id);
                              setIsDeptModalOpen(true);
                            }}
                            className="h-7 px-2 text-[11px] text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Setor
                          </Button>
                        </div>

                        {storeDepts.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {storeDepts.map((d) => {
                              const deptEqs = storeEquipment.filter((e) => e.department_id === d.id);
                              return (
                                <div
                                  key={d.id}
                                  onClick={() => setSelectedDeptDrawer(d)}
                                  className="group flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/30 hover:border-border cursor-pointer transition-colors"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-foreground/90 group-hover:text-foreground transition-colors">{d.name}</p>
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <Server className="h-3 w-3" /> {deptEqs.length} ativos alocados
                                    </p>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border/50 rounded-lg">
                            Nenhum setor ou rack cadastrado nesta loja.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* DRAWER: DEPARTMENT / RACK DETAILS */}
      <Drawer open={Boolean(selectedDeptDrawer)} onOpenChange={(open) => !open && setSelectedDeptDrawer(null)}>
        <DrawerContent size="default" className="flex flex-col h-full">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-400" />
              <span>{selectedDeptDrawer?.name}</span>
            </DrawerTitle>
            <DrawerDescription>
              {selectedDeptDrawer?.description || 'Detalhes do setor e ativos alocados neste local.'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar space-y-6">
            {selectedDeptDrawer && (
              <>
                {/* Equipment in this Dept */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5" /> Equipamentos Alocados
                  </h4>
                  
                  {equipmentList.filter((e) => e.department_id === selectedDeptDrawer.id).length > 0 ? (
                    <div className="space-y-2">
                      {equipmentList.filter((e) => e.department_id === selectedDeptDrawer.id).map((eq) => (
                        <div key={eq.id} className="flex flex-col p-3 rounded-lg border border-border/40 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">{eq.hostname || 'Sem nome'}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{eq.ip_address}</span>
                          </div>
                          <span className="text-xs text-muted-foreground mt-0.5">{eq.brand} {eq.model}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground p-4 text-center border border-dashed border-border/50 rounded-lg">
                      Nenhum equipamento alocado neste setor.
                    </p>
                  )}
                </div>

                <div className="h-px bg-border/40 w-full" />

                {/* Rack Photos / Documentation */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" /> Topologia e Fotos
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Anexe fotos do rack, fiação estruturada ou plantas do local para referência futura de manutenção.
                  </p>
                  <AttachmentManager
                    entityType="department"
                    entityId={selectedDeptDrawer.id}
                    title="Anexos do Local"
                    compact
                  />
                </div>
              </>
            )}
          </div>
          
          <DrawerFooter>
            <Button variant="outline" onClick={() => setSelectedDeptDrawer(null)}>Fechar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* DRAWER: CREATE STORE */}
      <Drawer open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
        <DrawerContent size="default">
          <form onSubmit={handleSaveStore} className="flex flex-col h-full">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                <span>Nova Loja / Unidade</span>
              </DrawerTitle>
              <DrawerDescription>Cadastre uma unidade operacional da empresa.</DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Nome da Unidade *</label>
                <Input
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  placeholder="Ex: Loja 04 - Shopping Centro"
                  className="bg-background/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Código da Unidade</label>
                  <Input
                    value={storeForm.code}
                    onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })}
                    placeholder="Ex: LJ-04"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Telefone</label>
                  <Input
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Endereço</label>
                <Input
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  placeholder="Av. Paulista, 1000 - Bela Vista"
                  className="bg-background/50"
                />
              </div>
            </div>

            <DrawerFooter>
              <Button type="button" variant="outline" onClick={() => setIsStoreModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar Loja</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* DRAWER: CREATE DEPARTMENT */}
      <Drawer open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DrawerContent size="default">
          <form onSubmit={handleSaveDept} className="flex flex-col h-full">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-400" />
                <span>Novo Departamento / Setor</span>
              </DrawerTitle>
              <DrawerDescription>Cadastre um setor interno ou rack para alocação.</DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Nome do Setor *</label>
                <Input
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="Ex: Rack Depósito CDI"
                  className="bg-background/50"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Descrição</label>
                <Input
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Ex: Ponto de concentração do galpão"
                  className="bg-background/50"
                />
              </div>
            </div>

            <DrawerFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeptModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Adicionar Setor</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
};
