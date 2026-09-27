import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Key,
  Users,
  Plus,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  Trash2,
  Lock,
  Mail,
  Pencil,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import type { LicenseItem, LicenseCreatePayload } from '@/types/infrastructure';

export interface LicensesTabProps {
  licenses: LicenseItem[];
  setLicenses: React.Dispatch<React.SetStateAction<LicenseItem[]>>;
  searchQuery: string;
  isLicenseModalOpen: boolean;
  setIsLicenseModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const LicensesTab: React.FC<LicensesTabProps> = ({
  licenses,
  setLicenses,
  searchQuery,
  isLicenseModalOpen,
  setIsLicenseModalOpen,
}) => {
  const { showToast } = useToast();
  const addToast = (opts: { title: string; description?: string; type?: ToastType }) => {
    showToast(opts.title, { message: opts.description, type: opts.type });
  };

  const [isAssignSeatModalOpen, setIsAssignSeatModalOpen] = useState(false);
  const [selectedLicenseForAssign, setSelectedLicenseForAssign] = useState<LicenseItem | null>(null);
  const [assigneeName, setAssigneeName] = useState('');

  const [editingLicenseId, setEditingLicenseId] = useState<number | null>(null);

  const [licForm, setLicForm] = useState<LicenseCreatePayload>({
    name: '',
    license_type: 'perpetua',
    vendor: '',
    license_key: '',
    account_email: '',
    total_seats: 1,
    cost: null,
    status: 'ativa',
    notes: '',
  });

  // State for revealed keys
  const [revealedKeys, setRevealedKeys] = useState<{ [id: number]: string }>({});
  const [revealingId, setRevealingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredLicenses = licenses.filter((lic) => {
    if (!searchQuery) return true;
    return (
      lic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lic.vendor && lic.vendor.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleSaveLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLicenseId) {
        const { license_key, ...updatePayload } = licForm; // prevent overriding key if not provided securely
        const payloadToSend = license_key ? licForm : updatePayload;
        
        const updated = await infrastructureService.updateLicense(editingLicenseId, payloadToSend);
        setLicenses((prev) => prev.map((item) => (item.id === editingLicenseId ? updated : item)));
        addToast({ title: 'Licença Atualizada', description: 'Metadados da licença atualizados.', type: 'success' });
      } else {
        const created = await infrastructureService.createLicense(licForm);
        setLicenses((prev) => [...prev, created]);
        addToast({
          title: 'Licença Cadastrada',
          description: `Licença ${created.name} registrada.`,
          type: 'success',
        });
      }
      setIsLicenseModalOpen(false);
      setEditingLicenseId(null);
      setLicForm({
        name: '',
        license_type: 'perpetua',
        vendor: '',
        license_key: '',
        account_email: '',
        total_seats: 1,
        cost: null,
        status: 'ativa',
        notes: '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar licença.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleAssignSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenseForAssign || !assigneeName.trim()) return;
    try {
      const assignment = await infrastructureService.assignLicenseSeat(selectedLicenseForAssign.id, {
        assigned_to: assigneeName.trim(),
      });
      const updatedAssignments = [...(selectedLicenseForAssign.assignments || []), assignment];
      const updatedLicense = {
        ...selectedLicenseForAssign,
        assignments: updatedAssignments,
        used_seats: updatedAssignments.length,
      };
      setLicenses((prev) => prev.map((l) => (l.id === updatedLicense.id ? updatedLicense : l)));
      setIsAssignSeatModalOpen(false);
      setAssigneeName('');
      addToast({
        title: 'Assento Atribuído',
        description: `Licença vinculada a ${assignment.assigned_to}.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atribuir assento.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleRevokeSeat = async (licenseId: number, assignmentId: number) => {
    try {
      await infrastructureService.revokeLicenseSeat(licenseId, assignmentId);
      setLicenses((prev) =>
        prev.map((lic) => {
          if (lic.id === licenseId) {
            const updated = (lic.assignments || []).filter((a) => a.id !== assignmentId);
            return { ...lic, assignments: updated, used_seats: updated.length };
          }
          return lic;
        })
      );
      addToast({
        title: 'Assento Liberado',
        description: 'Vínculo da licença revogado com sucesso.',
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao revogar licença.';
      addToast({ title: 'Erro', description: msg, type: 'error' });
    }
  };

  const handleRevealKey = async (id: number) => {
    if (revealedKeys[id]) {
      // Hide if already revealed
      setRevealedKeys((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    setRevealingId(id);
    try {
      const { license_key } = await infrastructureService.revealLicenseKey(id);
      setRevealedKeys((prev) => ({ ...prev, [id]: license_key }));
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setRevealedKeys((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao revelar chave.';
      addToast({ title: 'Erro de Autorização', description: msg, type: 'error' });
    } finally {
      setRevealingId(null);
    }
  };

  const handleCopyKey = async (id: number) => {
    try {
      let keyToCopy = revealedKeys[id];
      if (!keyToCopy) {
        // Fetch it silently
        const { license_key } = await infrastructureService.revealLicenseKey(id);
        keyToCopy = license_key;
      }
      
      await navigator.clipboard.writeText(keyToCopy);
      setCopiedId(id);
      
      // Auto-reset copy icon
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao copiar chave.';
      addToast({ title: 'Erro de Autorização', description: msg, type: 'error' });
    }
  };

  return (
    <>
      {filteredLicenses.length === 0 ? (
        <Card className="border-border/60 bg-card/40 border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground border border-border/50">
              <Key className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-semibold text-foreground font-heading">
                Nenhuma licença encontrada
              </h3>
              <p className="text-sm text-muted-foreground">
                Cadastre chaves de software para gerenciar alocações, assentos e uso na equipe.
              </p>
            </div>
            <Button onClick={() => {
              setEditingLicenseId(null);
              setLicForm({ name: '', license_type: 'perpetua', vendor: '', license_key: '', account_email: '', total_seats: 1, cost: null, status: 'ativa', notes: '' });
              setIsLicenseModalOpen(true);
            }} className="mt-2 flex items-center gap-2 shadow-sm cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Cadastrar Licença</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col border border-border/40 rounded-xl overflow-hidden bg-card/50">
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-muted-foreground border-b border-border/40 bg-muted/20">
            <div className="col-span-3">PRODUTO / FORNECEDOR</div>
            <div className="col-span-3">USO / ASSENTOS</div>
            <div className="col-span-2">STATUS</div>
            <div className="col-span-4">CHAVE DE ATIVAÇÃO</div>
          </div>
          
          <div className="flex flex-col">
            <AnimatePresence>
              {filteredLicenses.map((lic) => {
                const usedSeats = lic.used_seats || 0;
                const availableSeats = lic.total_seats - usedSeats;
                const percentageUsed = Math.min(100, Math.round((usedSeats / lic.total_seats) * 100));
                const isRevealed = !!revealedKeys[lic.id];
                const isCopied = copiedId === lic.id;

                return (
                  <motion.div
                    key={lic.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col border-b border-border/40 hover:bg-muted/30 transition-colors last:border-0"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center">
                      <div className="col-span-1 md:col-span-3 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground truncate">{lic.name}</h3>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs text-muted-foreground truncate">{lic.vendor || 'Interno / Vários'}</p>
                          {lic.account_email && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate" title={lic.account_email}>
                              <Mail className="h-3 w-3" /> {lic.account_email}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-3">
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="text-muted-foreground">
                            {usedSeats} de {lic.total_seats} ocupados
                          </span>
                          <span className={`font-medium ${availableSeats === 0 ? 'text-red-500' : availableSeats === 1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {availableSeats} livres
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-300 ${
                              percentageUsed >= 100 ? 'bg-red-500' : percentageUsed > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percentageUsed}%` }}
                          />
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-2 text-xs">
                        <span className={`font-medium capitalize ${lic.status === 'ativa' ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {lic.status}
                        </span>
                      </div>

                      <div className="col-span-1 md:col-span-4 flex items-center justify-between gap-3">
                        <div className="flex-1 font-mono text-[13px] bg-background border border-border/50 rounded-md px-2.5 py-1.5 flex items-center gap-2 overflow-hidden shadow-sm">
                          <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className={`truncate ${isRevealed ? 'text-foreground' : 'text-muted-foreground tracking-widest'}`}>
                            {isRevealed ? revealedKeys[lic.id] : '••••••••••••••••'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => handleRevealKey(lic.id)}
                            disabled={revealingId === lic.id}
                            title={isRevealed ? "Ocultar" : "Revelar por 5s"}
                          >
                            {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 cursor-pointer ${isCopied ? 'text-emerald-500 hover:text-emerald-400' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => handleCopyKey(lic.id)}
                            title="Cópia Segura"
                          >
                            {isCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Alocações expandidas sob a linha, de forma discreta */}
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-background/40 border border-border/40 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="h-3 w-3" /> Atribuições
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingLicenseId(lic.id);
                                setLicForm({
                                  name: lic.name,
                                  license_type: lic.license_type,
                                  vendor: lic.vendor || '',
                                  license_key: '',
                                  account_email: lic.account_email || '',
                                  total_seats: lic.total_seats,
                                  cost: lic.cost || null,
                                  status: lic.status,
                                  notes: lic.notes || '',
                                });
                                setIsLicenseModalOpen(true);
                              }}
                              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            {availableSeats > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLicenseForAssign(lic);
                                  setIsAssignSeatModalOpen(true);
                                }}
                                className="h-6 px-2 text-[10px] text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Atribuir
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {lic.assignments && lic.assignments.length > 0 ? (
                            lic.assignments.map((asgn) => (
                              <div
                                key={asgn.id}
                                className="group flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-xs border border-border/50"
                              >
                                <span className="font-medium text-foreground">{asgn.assigned_to}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeSeat(lic.id, asgn.id)}
                                  className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-400 focus:opacity-100 transition-opacity outline-none cursor-pointer"
                                  title="Revogar Assento"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Nenhum assento atribuído.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* DRAWER: CREATE LICENSE */}
      <Drawer open={isLicenseModalOpen} onOpenChange={setIsLicenseModalOpen}>
        <DrawerContent size="default">
          <form onSubmit={handleSaveLicense} className="flex flex-col h-full">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-400" />
                <span>{editingLicenseId ? 'Editar Licença' : 'Nova Licença de Software'}</span>
              </DrawerTitle>
              <DrawerDescription>Controle de quantidade de assentos, chaves de software e contas associadas.</DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Nome do Software / Produto *</label>
                <Input
                  value={licForm.name}
                  onChange={(e) => setLicForm({ ...licForm, name: e.target.value })}
                  placeholder="Ex: Windows 11 Pro OEM ou Office 2021"
                  className="bg-background/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Fabricante</label>
                  <Input
                    value={licForm.vendor || ''}
                    onChange={(e) => setLicForm({ ...licForm, vendor: e.target.value })}
                    placeholder="Ex: Microsoft"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Total de Assentos *</label>
                  <Input
                    type="number"
                    min={1}
                    value={licForm.total_seats}
                    onChange={(e) => setLicForm({ ...licForm, total_seats: Number(e.target.value) })}
                    className="bg-background/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Conta / E-mail Administrativo</label>
                <Input
                  value={licForm.account_email || ''}
                  onChange={(e) => setLicForm({ ...licForm, account_email: e.target.value })}
                  placeholder="Ex: admin@empresa.com ou Microsoft 365 Admin"
                  className="bg-background/50"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  E-mail ou conta usada para registro da licença. Não armazene senhas aqui. A integração com Vault será implementada em fase futura.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Chave / Token Seguro {editingLicenseId ? '(Opcional)' : ''}</label>
                <Input
                  value={licForm.license_key || ''}
                  onChange={(e) => setLicForm({ ...licForm, license_key: e.target.value })}
                  placeholder={editingLicenseId ? "Deixe em branco para manter a chave atual" : "Ex: XXXXX-YYYYY-ZZZZZ"}
                  className="bg-background/50 font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  A chave será armazenada de forma segura e não será exibida abertamente nas listagens.
                </p>
              </div>
            </div>

            <DrawerFooter>
              <Button type="button" variant="outline" onClick={() => { setIsLicenseModalOpen(false); setEditingLicenseId(null); }}>Cancelar</Button>
              <Button type="submit">{editingLicenseId ? 'Salvar Alterações' : 'Cadastrar Licença'}</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* DRAWER: ASSIGN LICENSE SEAT */}
      <Drawer open={isAssignSeatModalOpen} onOpenChange={setIsAssignSeatModalOpen}>
        <DrawerContent size="default">
          <form onSubmit={handleAssignSeat} className="flex flex-col h-full">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                <span>Atribuir Assento</span>
              </DrawerTitle>
              <DrawerDescription>
                Produto: {selectedLicenseForAssign?.name}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div className="bg-muted/30 border border-border/40 rounded-lg p-4 mb-4 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Assentos Livres:</span>
                <span className="font-bold text-emerald-500">
                  {(selectedLicenseForAssign?.total_seats || 0) - (selectedLicenseForAssign?.used_seats || 0)}
                </span>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Usuário, Máquina ou Loja *</label>
                <Input
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Ex: PC-CAIXA-01 ou João Silva"
                  className="bg-background/50"
                  required
                />
              </div>
            </div>

            <DrawerFooter>
              <Button type="button" variant="outline" onClick={() => setIsAssignSeatModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Confirmar Atribuição</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
};
