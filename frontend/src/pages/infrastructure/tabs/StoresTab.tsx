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
  Trash,
  Pencil,
  Archive,
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
import type { StoreItem, DepartmentItem, EquipmentItem, TechnicalLocationItem } from '@/types/infrastructure';

export interface StoresTabProps {
  stores: StoreItem[];
  setStores: React.Dispatch<React.SetStateAction<StoreItem[]>>;
  departments: DepartmentItem[];
  setDepartments: React.Dispatch<React.SetStateAction<DepartmentItem[]>>;
  technicalLocations: TechnicalLocationItem[];
  setTechnicalLocations: React.Dispatch<React.SetStateAction<TechnicalLocationItem[]>>;
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
  technicalLocations,
  setTechnicalLocations,
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
  
  const [editingStoreId, setEditingStoreId] = useState<number | null>(null);
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  
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

  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [locForm, setLocForm] = useState({
    name: '',
    location_type: 'rack',
    store_id: null as number | null,
    department_id: null as number | null,
    description: '',
    notes: '',
  });
  const [editingLocId, setEditingLocId] = useState<number | null>(null);

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
      if (editingStoreId) {
        const updated = await infrastructureService.updateStore(editingStoreId, storeForm);
        setStores((prev) => prev.map((s) => (s.id === editingStoreId ? updated : s)));
        addToast({ title: 'Unidade Atualizada', description: 'Dados atualizados com sucesso.', type: 'success' });
      } else {
        const created = await infrastructureService.createStore(storeForm);
        setStores((prev) => [...prev, created]);
        addToast({
          title: 'Loja Cadastrada',
          description: `Unidade ${created.name} cadastrada com sucesso.`,
          type: 'success',
        });
      }
      setIsStoreModalOpen(false);
      setEditingStoreId(null);
      setStoreForm({ name: '', code: '', address: '', phone: '', status: 'ativa', notes: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar loja.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleDeleteStore = async (id: number) => {
    if (!window.confirm('Arquivar/Inativar esta unidade? Dependências (se ativas) podem impedir a inativação.')) return;
    try {
      await infrastructureService.deleteStore(id);
      setStores((prev) => prev.map((s) => s.id === id ? { ...s, status: 'inativa' } : s));
      addToast({ title: 'Unidade Arquivada', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao arquivar unidade.';
      addToast({ title: 'Erro de Inativação', description: msg, type: 'error' });
    }
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDeptId) {
        const updated = await infrastructureService.updateDepartment(editingDeptId, {
          ...deptForm,
          store_id: selectedStoreForDept,
        });
        setDepartments((prev) => prev.map((d) => (d.id === editingDeptId ? updated : d)));
        addToast({ title: 'Setor Atualizado', description: 'Dados atualizados.', type: 'success' });
      } else {
        const created = await infrastructureService.createDepartment({
          ...deptForm,
          store_id: selectedStoreForDept,
        });
        setDepartments((prev) => [...prev, created]);
        addToast({
          title: 'Departamento Criado',
          description: `Setor ${created.name} adicionado.`,
          type: 'success',
        });
      }
      setIsDeptModalOpen(false);
      setEditingDeptId(null);
      setDeptForm({ name: '', description: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar departamento.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleDeleteDept = async (id: number) => {
    if (!window.confirm('Arquivar/Inativar este setor?')) return;
    try {
      await infrastructureService.deleteDepartment(id);
      setDepartments((prev) => prev.map((d) => d.id === id ? { ...d, status: 'inativa' } : d));
      addToast({ title: 'Setor Arquivado', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao arquivar setor.';
      addToast({ title: 'Erro de Inativação', description: msg, type: 'error' });
    }
  };

  const handleSaveLoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locForm.store_id || !locForm.name.trim()) return;
    
    const payload = {
      ...locForm,
      name: locForm.name.trim(),
      store_id: locForm.store_id as number,
      department_id: locForm.department_id as number | undefined,
    };

    try {
      if (editingLocId) {
        const updated = await infrastructureService.updateLocation(editingLocId, payload);
        setTechnicalLocations((prev) => prev.map((loc) => (loc.id === editingLocId ? updated : loc)));
        addToast({ title: 'Local Atualizado', type: 'success' });
      } else {
        const created = await infrastructureService.createLocation(payload);
        setTechnicalLocations((prev) => [...prev, created]);
        addToast({ title: 'Local Criado', type: 'success' });
      }
      setIsLocModalOpen(false);
      setEditingLocId(null);
      setLocForm({ name: '', location_type: 'rack', store_id: null, department_id: null, description: '', notes: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar local técnico.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleDeleteLoc = async (id: number) => {
    if (!window.confirm('Arquivar este local técnico?')) return;
    try {
      await infrastructureService.deleteLocation(id);
      setTechnicalLocations((prev) => prev.map((l) => l.id === id ? { ...l, status: 'inativa' } : l));
      addToast({ title: 'Local Arquivado', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir local técnico.';
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
              const storeLocs = technicalLocations.filter((l) => l.store_id === s.id && !l.department_id);
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
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-500"
                              onClick={() => {
                                setEditingStoreId(s.id);
                                setStoreForm({
                                  name: s.name,
                                  code: s.code || '',
                                  address: s.address || '',
                                  phone: s.phone || '',
                                  status: s.status,
                                  notes: s.notes || '',
                                });
                                setIsStoreModalOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                              onClick={() => handleDeleteStore(s.id)}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                            <Badge variant={s.status === 'ativa' ? 'outline' : 'destructive'} className="capitalize bg-background text-[10px]">
                              {s.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Store Departments / Racks */}
                      <div className="flex-1 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5" /> Setores / Locais
                          </span>
                          <div className="flex items-center gap-1">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setLocForm(prev => ({ ...prev, store_id: s.id, department_id: null }));
                                setIsLocModalOpen(true);
                              }}
                              className="h-7 px-2 text-[11px] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Local (Unidade)
                            </Button>
                          </div>
                        </div>

                        {storeDepts.length > 0 || storeLocs.length > 0 ? (
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
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-500"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingDeptId(d.id);
                                        setSelectedStoreForDept(s.id);
                                        setDeptForm({
                                          name: d.name,
                                          description: d.description || '',
                                        });
                                        setIsDeptModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDept(d.id);
                                      }}
                                    >
                                      <Archive className="h-3.5 w-3.5" />
                                    </Button>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                                  </div>
                                </div>
                              );
                            })}
                            {storeLocs.map((loc) => {
                              const locEqs = storeEquipment.filter((e) => e.technical_location_id === loc.id);
                              return (
                                <div
                                  key={`loc-${loc.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingLocId(loc.id);
                                    setLocForm({
                                      name: loc.name,
                                      location_type: loc.location_type || 'rack',
                                      store_id: loc.store_id,
                                      department_id: loc.department_id ?? null,
                                      description: loc.description || '',
                                      notes: loc.notes || '',
                                    });
                                    setIsLocModalOpen(true);
                                  }}
                                  className="group flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/30 hover:border-amber-500/30 cursor-pointer transition-colors"
                                >
                                  <div>
                                    <div className="text-sm font-semibold text-foreground/90 group-hover:text-foreground transition-colors flex items-center gap-1.5">
                                      {loc.name}
                                      {loc.location_type && (
                                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/30 text-amber-500/80 uppercase">
                                          {loc.location_type}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <Server className="h-3 w-3" /> {locEqs.length} ativos alocados
                                    </p>
                                  </div>
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
                {/* Technical Locations in this Dept */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" /> Locais Técnicos
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocForm(prev => ({ ...prev, store_id: selectedDeptDrawer.store_id ?? null, department_id: selectedDeptDrawer.id, name: '', location_type: 'rack', description: '', notes: '' }));
                        setEditingLocId(null);
                        setIsLocModalOpen(true);
                      }}
                      className="h-7 px-2 text-[11px] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Local (Setor)
                    </Button>
                  </div>
                  {technicalLocations.filter((l) => l.department_id === selectedDeptDrawer.id).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {technicalLocations.filter((l) => l.department_id === selectedDeptDrawer.id).map((loc) => (
                        <div
                          key={loc.id}
                          onClick={() => {
                            setEditingLocId(loc.id);
                            setLocForm({
                              name: loc.name,
                              location_type: loc.location_type || 'rack',
                              store_id: loc.store_id ?? null,
                              department_id: loc.department_id ?? null,
                              description: loc.description || '',
                              notes: loc.notes || '',
                            });
                            setIsLocModalOpen(true);
                          }}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/30 hover:border-amber-500/30 cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              {loc.name}
                              {loc.location_type && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/30 text-amber-500/80 uppercase">
                                  {loc.location_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground p-4 text-center border border-dashed border-border/50 rounded-lg">
                      Nenhum local técnico cadastrado neste setor.
                    </p>
                  )}
                </div>

                <div className="h-px bg-border/40 w-full" />

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
      {/* DRAWER: CREATE LOCATION */}
      <Drawer open={isLocModalOpen} onOpenChange={setIsLocModalOpen}>
        <DrawerContent size="default">
          <form onSubmit={handleSaveLoc} className="flex flex-col h-full">
            <DrawerHeader>
              <DrawerTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-amber-500" />
                  <span>{editingLocId ? 'Editar Local Técnico' : (locForm.department_id ? 'Novo Local Técnico do Setor' : 'Novo Local Técnico da Unidade')}</span>
                </div>
                {editingLocId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsLocModalOpen(false);
                      handleDeleteLoc(editingLocId);
                    }}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    title="Excluir Local"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
              </DrawerTitle>
              <DrawerDescription>Cadastre um rack, armário ou ponto de rede específico.</DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Nome do Local *</label>
                <Input
                  value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                  placeholder="Ex: Rack Principal, Armário 02"
                  className="bg-background/50"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Tipo de Local</label>
                <select
                  value={locForm.location_type || 'rack'}
                  onChange={(e) => setLocForm({ ...locForm, location_type: e.target.value })}
                  className="w-full h-9 rounded-lg border border-border/80 bg-background/50 px-3 text-sm text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="rack">Rack</option>
                  <option value="network_cabinet">Armário de Rede</option>
                  <option value="cpd">CPD</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Descrição</label>
                <Input
                  value={locForm.description || ''}
                  onChange={(e) => setLocForm({ ...locForm, description: e.target.value })}
                  placeholder="Ex: Rack fechado com chave"
                  className="bg-background/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Observações Internas</label>
                <textarea
                  value={locForm.notes || ''}
                  onChange={(e) => setLocForm({ ...locForm, notes: e.target.value })}
                  placeholder="Informações adicionais..."
                  className="w-full h-20 rounded-lg border border-border/80 bg-background/50 p-3 text-sm text-foreground focus:outline-none resize-none"
                />
              </div>
            </div>

            <DrawerFooter>
              <Button type="button" variant="outline" onClick={() => setIsLocModalOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingLocId ? 'Salvar Alterações' : 'Criar Local Técnico'}</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
};
