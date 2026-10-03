import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar, FilterSelect } from '@/components/ui/FilterBar';
import { statusOptions } from '@/lib/status';
import { useConfirm } from '@/hooks/useConfirm';
import { motion, AnimatePresence } from 'motion/react';
import {
  Headset,
  Plus,
  ExternalLink,
  HardDrive,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { attendanceService } from '@/services/attendanceService';
import { projectService } from '@/services/projectService';
import { useDeepLinkId, clearDeepLinkId } from '@/hooks/useDeepLink';
import { AttendanceDetailDrawer } from '@/components/attendance/AttendanceDetailDrawer';
import { AttendanceFormDrawer } from '@/components/attendance/AttendanceFormDrawer';
import { EMPTY_FORM, attendanceToForm } from '@/components/attendance/attendanceForm';
import { Pagination } from '@/components/ui/Pagination';
import { equipmentLabel } from '@/lib/equipment';
import { infrastructureService } from '@/services/infrastructureService';
import type {
  AttendanceItem,
  AttendanceCreateInput,
} from '@/types/attendance';

const PAGE_SIZE = 30;

export const AttendancePage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { success, error: toastError } = useToast();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [onlyOtrs, setOnlyOtrs] = useState(false);

  // Data state
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAttendances, setTotalAttendances] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drawer state: Create / Edit Attendance
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceItem | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceCreateInput>(EMPTY_FORM);

  const [lockedProjectName, setLockedProjectName] = useState<string | undefined>();


  // Drawer state: Details
  const [selectedAttendanceDetails, setSelectedAttendanceDetails] = useState<AttendanceItem | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Attendances
  const loadAttendances = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await attendanceService.getAttendances({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        has_otrs: onlyOtrs ? true : undefined,
        search: searchQuery || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setAttendances(data.items);
      setTotalPages(data.total_pages);
      setTotalAttendances(data.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar atendimentos';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, onlyOtrs, searchQuery, page]);

  useEffect(() => {
    loadAttendances();
  }, [loadAttendances]);

  // #attendance?new=true[&project_id=N]: abre o formulário de novo atendimento
  useEffect(() => {
    const handleHashChange = () => {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const id = hashParams.get('id');
      const isNew = hashParams.get('new') === 'true';
      
      if (isNew) {
        const projectIdStr = hashParams.get('project_id');
        const projectNameStr = hashParams.get('project_name');
        const pId = projectIdStr ? parseInt(projectIdStr, 10) : undefined;
        
        if (projectNameStr) {
          setLockedProjectName(decodeURIComponent(projectNameStr));
        } else if (pId) {
          projectService.getProject(pId)
            .then(p => { if (p?.title) setLockedProjectName(p.title); })
            .catch(() => setLockedProjectName(`Projeto #${pId}`));
        } else {
          setLockedProjectName(undefined);
        }

        setEditingAttendance(null);
        setAttendanceForm({ ...EMPTY_FORM, project_id: pId });
        // #attendance?new=true&equipment_id=N: atendimento aberto a partir da ficha do equipamento
        const equipmentId = Number(hashParams.get('equipment_id'));
        if (equipmentId) {
          infrastructureService
            .getEquipmentById(equipmentId)
            .then((eq) =>
              setAttendanceForm((prev) => ({
                ...prev,
                equipment_id: eq.id,
                equipment_name: equipmentLabel(eq),
                store_department: [eq.store?.name, eq.department?.name].filter(Boolean).join(' / '),
              }))
            )
            .catch(() => {});
        }
        setIsFormOpen(true);
        // Clear query parameters while keeping #attendance tab intact
        window.history.replaceState(null, '', '#attendance');
      } else if (!id) {
        // Voltar no navegador (hash sem id) fecha o detalhe
        setSelectedAttendanceDetails(null);
      }
    };

    // Run initially and on popstate/hashchange
    handleHashChange();
    window.addEventListener('popstate', handleHashChange);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handleHashChange);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Detalhe sempre vem do servidor: a listagem não traz as notas.
  const openAttendanceDetails = async (id: number) => {
    try {
      setSelectedAttendanceDetails(await attendanceService.getAttendance(id));
    } catch {
      clearDeepLinkId();
    }
  };

  // #attendance?id=N: abre o detalhe (busca global, Início, ficha do equipamento)
  useDeepLinkId('attendance', openAttendanceDetails);

  // Open Create/Edit Drawer
  const handleOpenForm = (att?: AttendanceItem) => {
    if (att) {
      setEditingAttendance(att);
      setAttendanceForm(attendanceToForm(att));
      setSelectedAttendanceDetails(null); // Close details if open
    } else {
      setEditingAttendance(null);
      setLockedProjectName(undefined);
      setAttendanceForm(EMPTY_FORM);
    }
    setIsFormOpen(true);
  };

  // Save Attendance (Create/Edit)
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceForm.title.trim()) {
      toastError('Campo obrigatório', 'Informe o título do atendimento.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAttendance) {
        await attendanceService.updateAttendance(editingAttendance.id, attendanceForm);
        success('Atendimento atualizado', 'As informações técnicas foram atualizadas.');
      } else {
        await attendanceService.createAttendance(attendanceForm);
        success('Atendimento registrado', 'Novo atendimento interno registrado com sucesso.');
      }
      setIsFormOpen(false);
      loadAttendances();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar atendimento';
      toastError('Erro ao salvar', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Attendance
  const confirm = useConfirm();

  const handleDeleteAttendance = async (att: AttendanceItem) => {
    if (!(await confirm({ title: 'Excluir atendimento?', description: `"${att.title}" e suas notas serão removidos. O chamado no OTRS não é afetado.` }))) return;
    try {
      await attendanceService.deleteAttendance(att.id);
      success('Atendimento excluído', 'O registro foi removido com sucesso.');
      setSelectedAttendanceDetails(null);
      loadAttendances();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir atendimento';
      toastError('Erro ao excluir', msg);
    }
  };

  // Add Technical Note
  // Permissions
  const canModifyAttendance = (att: AttendanceItem) => {
    if (!user) return false;
    return hasRole('Administrador') || att.technician_id === user.id;
  };

  // Status badge config
  const getStatusBadge = (status: string) => <StatusBadge domain="attendance" status={status} className="text-[10px] uppercase py-0 leading-tight" />;

  return (
    <div className="space-y-6">
      <PageHeader icon={Headset} title="Atendimentos" description="Diagnóstico, solução e comandos de cada atendimento. O chamado oficial continua no OTRS.">
        <Button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 shadow-sm cursor-pointer w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Atendimento</span>
        </Button>
      </PageHeader>

      <FilterBar
        search={searchQuery}
        onSearch={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        placeholder="Buscar por chamado OTRS, título, diagnóstico, equipamento..."
      >
        <FilterSelect
          label="Status"
          value={selectedStatus}
          onChange={(value) => {
            setSelectedStatus(value);
            setPage(1);
          }}
          options={statusOptions('attendance')}
        />
        <Button
          variant={onlyOtrs ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setOnlyOtrs(!onlyOtrs);
            setPage(1);
          }}
          className={`h-9 text-xs font-medium gap-1.5 cursor-pointer ${onlyOtrs ? 'shadow-sm' : 'border-border/60'}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Só com chamado OTRS
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={loadAttendances}
          className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Atualizar lista"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </FilterBar>

      {/* 4. Main Content Area */}
      {errorMessage && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-destructive">Falha ao carregar atendimentos</h3>
              <p className="text-sm text-destructive/80 font-medium">{errorMessage}</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={loadAttendances}
              className="mt-2 h-8"
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/60 bg-card/40">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-96" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !errorMessage && attendances.length === 0 && (
        <Card className="border-border/60 bg-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Headset className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-bold text-foreground font-heading">
                Nenhum atendimento operacional
              </h3>
              <p className="text-sm text-muted-foreground font-medium">
                {searchQuery || selectedStatus !== 'all' || onlyOtrs
                  ? 'Nenhum atendimento corresponde aos filtros aplicados.'
                  : 'Registre diagnósticos, comandos e procedimentos técnicos para criar o histórico da equipe.'}
              </p>
            </div>
            <Button onClick={() => handleOpenForm()} className="mt-2 h-9 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Atendimento
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && attendances.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence>
            {attendances.map((att) => (
              <motion.div
                key={att.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  className="border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    window.history.pushState(null, '', `#attendance?id=${att.id}`);
                    openAttendanceDetails(att.id);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left Block: Title & Summary */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {att.otrs_ticket && (
                            <Badge variant="default" className="text-[10px] uppercase py-0 leading-tight bg-blue-600/15 text-blue-400 hover:bg-blue-600/25 border-blue-500/30">
                              OTRS #{att.otrs_ticket}
                            </Badge>
                          )}
                          {getStatusBadge(att.status)}
                          {att.knowledge_article_id && (
                            <Badge variant="outline" className="text-[10px] uppercase py-0 leading-tight border-border/60 flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5 text-primary" />
                              KB Vinculado
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-foreground font-heading tracking-tight group-hover:text-primary transition-colors">
                          {att.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 font-medium">
                          {att.diagnosis || att.problem_description || 'Sem descrição detalhada'}
                        </p>
                      </div>

                      {/* Right Block: Metadata */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5 shrink-0 text-xs font-medium text-muted-foreground/80">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span>{att.technician?.username || 'Sistema'}</span>
                        </div>
                        {att.equipment_name && (
                          <div className="flex items-center gap-1.5">
                            <HardDrive className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[120px]">{att.equipment_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[11px] mt-1 opacity-70">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(att.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="flex flex-col items-center gap-2 pt-2">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            <p className="text-[11px] text-muted-foreground">{totalAttendances} atendimento(s)</p>
          </div>
        </div>
      )}

      {/* Detalhe do atendimento */}
      <AttendanceDetailDrawer
        key={selectedAttendanceDetails?.id ?? 'fechado'}
        attendance={selectedAttendanceDetails}
        onClose={() => {
          setSelectedAttendanceDetails(null);
          clearDeepLinkId();
        }}
        onUpdated={(updated) => {
          setSelectedAttendanceDetails(updated);
          setAttendances((prev) =>
            prev.map((a) => (a.id === updated.id ? { ...a, knowledge_article_id: updated.knowledge_article_id } : a))
          );
        }}
        onEdit={handleOpenForm}
        onDelete={handleDeleteAttendance}
        canModify={selectedAttendanceDetails ? canModifyAttendance(selectedAttendanceDetails) : false}
      />

      {/* Novo atendimento / edição */}
      <AttendanceFormDrawer
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setLockedProjectName(undefined);
        }}
        isEditing={Boolean(editingAttendance)}
        form={attendanceForm}
        setForm={setAttendanceForm}
        lockedProjectName={lockedProjectName}
        isSubmitting={isSubmitting}
        onSubmit={handleSaveAttendance}
      />
    </div>
  );
};
