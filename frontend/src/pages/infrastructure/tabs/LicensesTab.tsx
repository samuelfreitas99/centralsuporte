import React, { useState } from 'react';
import { Key, Users, Plus } from 'lucide-react';
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

  const [licForm, setLicForm] = useState<LicenseCreatePayload>({
    name: '',
    license_type: 'perpetua',
    vendor: '',
    license_key: '',
    total_seats: 1,
    cost: null,
    status: 'ativa',
    notes: '',
  });

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
      const created = await infrastructureService.createLicense(licForm);
      setLicenses((prev) => [...prev, created]);
      setIsLicenseModalOpen(false);
      setLicForm({
        name: '',
        license_type: 'perpetua',
        vendor: '',
        license_key: '',
        total_seats: 1,
        cost: null,
        status: 'ativa',
        notes: '',
      });
      addToast({
        title: 'Licença Cadastrada',
        description: `Licença ${created.name} registrada.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar licença.';
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

  return (
    <>
      {filteredLicenses.length === 0 ? (
        <Card className="border-border/60 bg-card/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Nenhuma licença encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLicenses.map((lic) => {
            const usedSeats = lic.used_seats || 0;
            const availableSeats = lic.total_seats - usedSeats;
            const percentageUsed = Math.min(100, Math.round((usedSeats / lic.total_seats) * 100));

            return (
              <Card key={lic.id} className="border-border/80 bg-card/75 hover:border-blue-500/40 transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground font-heading">{lic.name}</h3>
                      <p className="text-xs text-muted-foreground">Fornecedor: {lic.vendor || 'Interno / Vários'}</p>
                    </div>
                    <Badge variant={lic.status === 'ativa' ? 'success' : 'destructive'} className="capitalize">
                      {lic.status}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Assentos Utilizados</span>
                      <span className="font-mono font-bold text-foreground">
                        {usedSeats} / {lic.total_seats} ({availableSeats} livres)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percentageUsed >= 100
                            ? 'bg-red-500'
                            : percentageUsed > 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentageUsed}%` }}
                      />
                    </div>
                  </div>

                  {lic.license_key && (
                    <div className="rounded-xl border border-border/60 bg-slate-950 p-2 text-center font-mono text-xs text-blue-300">
                      Chave: •••••-•••••-{lic.license_key.length > 6 ? lic.license_key.slice(-6) : lic.license_key}
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-blue-400" />
                        <span>Atribuições ({usedSeats})</span>
                      </span>

                      {availableSeats > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLicenseForAssign(lic);
                            setIsAssignSeatModalOpen(true);
                          }}
                          className="h-6 px-2 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          <span>Atribuir</span>
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {lic.assignments && lic.assignments.length > 0 ? (
                        lic.assignments.map((asgn) => (
                          <div
                            key={asgn.id}
                            className="flex items-center justify-between rounded-lg bg-background/50 px-2 py-1 border border-border/40 text-[11px]"
                          >
                            <span className="font-medium text-foreground">{asgn.assigned_to}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeSeat(lic.id, asgn.id)}
                              className="h-5 px-1.5 text-red-400 hover:text-red-300 cursor-pointer"
                              title="Revogar assento"
                            >
                              Revogar
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic text-center py-2">
                          Nenhum assento atribuído ainda.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE LICENSE */}
      <Dialog open={isLicenseModalOpen} onOpenChange={setIsLicenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveLicense} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Key className="h-5 w-5 text-blue-400" />
                <span>Nova Licença de Software</span>
              </DialogTitle>
              <DialogDescription>Controle de quantidade de assentos e chaves de software.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground mb-1 block">Nome do Software / Produto *</label>
                <Input
                  value={licForm.name}
                  onChange={(e) => setLicForm({ ...licForm, name: e.target.value })}
                  placeholder="Ex: Windows 11 Pro OEM ou Office 2021"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Fabricante / Fornecedor</label>
                  <Input
                    value={licForm.vendor || ''}
                    onChange={(e) => setLicForm({ ...licForm, vendor: e.target.value })}
                    placeholder="Ex: Microsoft"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Total de Assentos *</label>
                  <Input
                    type="number"
                    min={1}
                    value={licForm.total_seats}
                    onChange={(e) => setLicForm({ ...licForm, total_seats: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground mb-1 block">Chave / Chave de Produto (Token)</label>
                <Input
                  value={licForm.license_key || ''}
                  onChange={(e) => setLicForm({ ...licForm, license_key: e.target.value })}
                  placeholder="Ex: XXXXX-YYYYY-ZZZZZ-WWWWW"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsLicenseModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar Licença</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: ASSIGN LICENSE SEAT */}
      <Dialog open={isAssignSeatModalOpen} onOpenChange={setIsAssignSeatModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAssignSeat} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Users className="h-5 w-5 text-blue-400" />
                <span>Atribuir Assento de Licença</span>
              </DialogTitle>
              <DialogDescription>
                {selectedLicenseForAssign?.name} (Assentos disponíveis:{' '}
                {(selectedLicenseForAssign?.total_seats || 0) - (selectedLicenseForAssign?.used_seats || 0)})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground mb-1 block">Usuário, Máquina ou Loja *</label>
                <Input
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Ex: Operador Caixa PDV 01 ou João Silva"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAssignSeatModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Atribuir Assento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
