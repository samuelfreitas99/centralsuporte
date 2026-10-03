import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Headset,
  Search,
  Plus,
  ExternalLink,
  HardDrive,
  MapPin,
  CheckCircle2,
  Clock,
  BookOpen,
  Terminal,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  MessageSquare,
  Send,
  Sparkles,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { attendanceService } from '@/services/attendanceService';
import { projectService } from '@/services/projectService';
import { AttachmentManager } from '@/components/attachments/AttachmentManager';
import { ProjectSelect } from '@/components/projects/ProjectSelect';
import { useDeepLinkId, clearDeepLinkId } from '@/hooks/useDeepLink';
import type {
  AttendanceItem,
  AttendanceCreateInput,
} from '@/types/attendance';

export const AttendancePage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { success, error: toastError } = useToast();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [onlyOtrs, setOnlyOtrs] = useState(false);

  // Data state
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCmdId, setCopiedCmdId] = useState<number | null>(null);

  // Drawer state: Create / Edit Attendance
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceItem | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceCreateInput>({
    title: '',
    otrs_ticket: '',
    otrs_url: '',
    requester_name: '',
    status: 'em_andamento',
    equipment_name: '',
    store_department: '',
    problem_description: '',
    symptoms: '',
    diagnosis: '',
    cause: '',
    solution: '',
    commands_used: '',
    internal_notes: '',
    project_id: undefined,
  });

  const [lockedProjectName, setLockedProjectName] = useState<string | undefined>();


  // Drawer state: Details
  const [selectedAttendanceDetails, setSelectedAttendanceDetails] = useState<AttendanceItem | null>(null);
  const [detailsTab, setDetailsTab] = useState('info');

  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertingId, setConvertingId] = useState<number | null>(null);

  // Load Attendances
  const loadAttendances = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await attendanceService.getAttendances({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        has_otrs: onlyOtrs ? true : undefined,
        search: searchQuery || undefined,
      });
      setAttendances(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar atendimentos';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, onlyOtrs, searchQuery]);

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
        setAttendanceForm({
          title: '',
          otrs_ticket: '',
          otrs_url: '',
          requester_name: '',
          status: 'em_andamento',
          equipment_name: '',
          store_department: '',
          problem_description: '',
          symptoms: '',
          diagnosis: '',
          cause: '',
          solution: '',
          commands_used: '',
          internal_notes: '',
          project_id: pId,
        });
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

  // #attendance?id=N: abre o detalhe (busca global, Início, ficha do equipamento)
  useDeepLinkId('attendance', async (id) => {
    try {
      setSelectedAttendanceDetails(await attendanceService.getAttendance(id));
      setDetailsTab('info');
    } catch {
      clearDeepLinkId();
    }
  });

  // One-click copy commands used
  const handleCopyCommands = async (commands: string, id: number) => {
    if (!commands) return;
    try {
      await navigator.clipboard.writeText(commands);
      setCopiedCmdId(id);
      success('Comandos copiados!', 'Comandos utilizados foram copiados para a área de transferência.');
    } catch {
      toastError('Erro ao copiar', 'Não foi possível copiar os comandos.');
    } finally {
      setTimeout(() => setCopiedCmdId(null), 2000);
    }
  };

  // Convert to Knowledge Action
  const handleConvertToKnowledge = async (att: AttendanceItem) => {
    setConvertingId(att.id);
    try {
      const article = await attendanceService.convertToKnowledge(att.id);
      success(
        'Rascunho criado na Base de Conhecimento!',
        `Artigo "${article.title}" gerado com sucesso para revisão técnica.`
      );
      // Update attendance with linked article id
      setAttendances((prev) =>
        prev.map((a) => (a.id === att.id ? { ...a, knowledge_article_id: article.id } : a))
      );
      if (selectedAttendanceDetails?.id === att.id) {
        setSelectedAttendanceDetails(prev => prev ? { ...prev, knowledge_article_id: article.id } : prev);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao converter atendimento em conhecimento';
      toastError('Erro na conversão', msg);
    } finally {
      setConvertingId(null);
    }
  };

  // Open Create/Edit Drawer
  const handleOpenForm = (att?: AttendanceItem) => {
    if (att) {
      setEditingAttendance(att);
      setAttendanceForm({
        title: att.title,
        otrs_ticket: att.otrs_ticket || '',
        otrs_url: att.otrs_url || '',
        requester_name: att.requester_name || '',
        status: att.status || 'em_andamento',
        equipment_name: att.equipment_name || '',
        store_department: att.store_department || '',
        problem_description: att.problem_description || '',
        symptoms: att.symptoms || '',
        diagnosis: att.diagnosis || '',
        cause: att.cause || '',
        solution: att.solution || '',
        commands_used: att.commands_used || '',
        internal_notes: att.internal_notes || '',
        project_id: att.project_id || undefined,
      });
      setSelectedAttendanceDetails(null); // Close details if open
    } else {
      setEditingAttendance(null);
      setLockedProjectName(undefined);
      setAttendanceForm({
        title: '',
        otrs_ticket: '',
        otrs_url: '',
        requester_name: '',
        status: 'em_andamento',
        equipment_name: '',
        store_department: '',
        problem_description: '',
        symptoms: '',
        diagnosis: '',
        cause: '',
        solution: '',
        commands_used: '',
        internal_notes: '',
        project_id: undefined,
      });
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
  const handleDeleteAttendance = async (att: AttendanceItem) => {
    if (!window.confirm(`Tem certeza que deseja excluir o atendimento "${att.title}"?`)) return;
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
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendanceDetails || !newNoteText.trim()) return;

    setIsSubmittingNote(true);
    try {
      const createdNote = await attendanceService.addNote(selectedAttendanceDetails.id, newNoteText.trim());
      success('Nota técnica adicionada', 'Novo apontamento registrado no atendimento.');
      setNewNoteText('');

      // Update local state
      const updatedNotes = [...selectedAttendanceDetails.notes, createdNote];
      setSelectedAttendanceDetails({ ...selectedAttendanceDetails, notes: updatedNotes });
      setAttendances((prev) =>
        prev.map((a) => (a.id === selectedAttendanceDetails.id ? { ...a, notes: updatedNotes } : a))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao adicionar nota';
      toastError('Erro', msg);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Permissions
  const canModifyAttendance = (att: AttendanceItem) => {
    if (!user) return false;
    return hasRole('Administrador') || att.technician_id === user.id;
  };

  // Status badge config
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolvido':
      case 'concluido':
        return <Badge variant="success" className="text-[10px] uppercase py-0 leading-tight">Resolvido</Badge>;
      case 'cancelado':
        return <Badge variant="destructive" className="text-[10px] uppercase py-0 leading-tight">Cancelado</Badge>;
      case 'em_andamento':
      default:
        return <Badge variant="warning" className="text-[10px] uppercase py-0 leading-tight">Em Andamento</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Atendimentos
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Registro técnico operacional, diagnósticos, e comandos vinculados a chamados OTRS.
          </p>
        </div>

        <Button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 shadow-sm cursor-pointer w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Atendimento</span>
        </Button>
      </div>

      {/* 2. OTRS Architectural Complementarity Alert */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-muted-foreground shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <ExternalLink className="h-4 w-4 text-primary" />
            <span>Integração Oficial com OTRS</span>
          </span>
          <span className="hidden sm:inline">—</span>
          <span className="font-medium text-center sm:text-left">Abertura, SLA, histórico do cliente e encerramento ocorrem exclusivamente no OTRS. A Central armazena detalhes técnicos restritos.</span>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por chamado OTRS, título, diagnóstico, equipamento..."
            className="pl-9 h-9 bg-background/50 border-border/60 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border border-border/60 bg-background/50 px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-9"
          >
            <option value="all">Todos os Status</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="resolvido">Resolvido</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <Button
            variant={onlyOtrs ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyOtrs(!onlyOtrs)}
            className={`h-9 text-xs font-medium gap-1.5 cursor-pointer ${onlyOtrs ? 'shadow-sm' : 'border-border/60'}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Apenas OTRS</span>
            <span className="sm:hidden">OTRS</span>
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
        </div>
      </div>

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
                    setSelectedAttendanceDetails(att);
                    setDetailsTab('info');
                    window.history.pushState(null, '', `#attendance?id=${att.id}`);
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
                          <span>{new Date(att.updated_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* DRAWER: DETAILS VIEW (Progressive Disclosure) */}
      <Drawer open={Boolean(selectedAttendanceDetails)} onOpenChange={(open) => {
        if (!open) {
          setSelectedAttendanceDetails(null);
          clearDeepLinkId();
        }
      }}>
        <DrawerContent side="right" size="lg" className="p-0 flex flex-col h-full rounded-l-2xl sm:rounded-l-2xl rounded-tr-none sm:rounded-tr-none">
          {selectedAttendanceDetails && (
            <>
              <DrawerHeader className="px-6 py-5 bg-card border-b border-border/60">
                <div className="flex items-center gap-2 mb-3">
                  {selectedAttendanceDetails.otrs_ticket ? (
                    <a
                      href={selectedAttendanceDetails.otrs_url || '#'}
                      target={selectedAttendanceDetails.otrs_url ? '_blank' : '_self'}
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Chamado OTRS #{selectedAttendanceDetails.otrs_ticket}</span>
                    </a>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
                      Atendimento Interno
                    </Badge>
                  )}
                  {getStatusBadge(selectedAttendanceDetails.status)}
                </div>
                <DrawerTitle className="text-xl leading-snug mb-1">
                  {selectedAttendanceDetails.title}
                </DrawerTitle>
                <DrawerDescription className="flex items-center gap-3 mt-2 text-xs font-medium">
                  <span className="flex items-center gap-1 text-foreground/80"><User className="h-3.5 w-3.5 text-muted-foreground" /> {selectedAttendanceDetails.technician?.username}</span>
                  {selectedAttendanceDetails.equipment_name && (
                    <span className="flex items-center gap-1 text-foreground/80"><HardDrive className="h-3.5 w-3.5 text-muted-foreground" /> {selectedAttendanceDetails.equipment_name}</span>
                  )}
                  {selectedAttendanceDetails.store_department && (
                    <span className="flex items-center gap-1 text-foreground/80"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {selectedAttendanceDetails.store_department}</span>
                  )}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
                <Tabs value={detailsTab} onValueChange={setDetailsTab} className="w-full h-full flex flex-col">
                  <TabsList className="mb-6 w-full justify-start border-b border-border/40 rounded-none h-auto p-0 bg-transparent gap-6">
                    <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 py-2 text-sm">
                      Detalhes Técnicos
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 py-2 text-sm flex items-center gap-2">
                      Notas & Anexos
                      <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px]">
                        {selectedAttendanceDetails.notes?.length || 0}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-6 flex-1 outline-none mt-0">
                    <div className="grid gap-6">
                      {/* Diagnóstico */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-primary" />
                          Diagnóstico & Relato
                        </h4>
                        <div className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground leading-relaxed shadow-sm">
                          {selectedAttendanceDetails.diagnosis || selectedAttendanceDetails.problem_description || 'Nenhum detalhe informado.'}
                        </div>
                      </div>

                      {/* Causa */}
                      {selectedAttendanceDetails.cause && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            Causa Raiz
                          </h4>
                          <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm text-foreground/80 leading-relaxed shadow-sm">
                            {selectedAttendanceDetails.cause}
                          </div>
                        </div>
                      )}

                      {/* Solução */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Procedimento de Solução
                        </h4>
                        <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-foreground/80 leading-relaxed shadow-sm">
                          {selectedAttendanceDetails.solution || 'Procedimento ainda não finalizado.'}
                        </div>
                      </div>

                      {/* Comandos */}
                      {selectedAttendanceDetails.commands_used && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                              <Terminal className="h-4 w-4 text-primary" />
                              Comandos Utilizados
                            </h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyCommands(selectedAttendanceDetails.commands_used!, selectedAttendanceDetails.id)}
                              className="h-7 text-xs font-medium cursor-pointer hover:bg-muted/50"
                            >
                              {copiedCmdId === selectedAttendanceDetails.id ? (
                                <><Check className="h-3 w-3 mr-1.5 text-success" /> Copiado!</>
                              ) : (
                                <><Copy className="h-3 w-3 mr-1.5" /> Copiar</>
                              )}
                            </Button>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-slate-950 p-4 shadow-inner">
                            <pre className="font-mono text-xs text-blue-300 whitespace-pre-wrap break-all">
                              {selectedAttendanceDetails.commands_used}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-6 flex-1 flex flex-col outline-none mt-0">
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      {selectedAttendanceDetails.notes && selectedAttendanceDetails.notes.length > 0 ? (
                        selectedAttendanceDetails.notes.map((n) => (
                          <div key={n.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-2 shadow-sm">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                {n.author?.username || 'Técnico'}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed">{n.note}</p>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">Nenhuma nota registrada.</p>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleAddNote} className="pt-4 border-t border-border/60 shrink-0">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-foreground">Nova Nota Técnica</label>
                        <div className="flex items-end gap-2">
                          <textarea
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            placeholder="Registre observações sobre testes, progresso..."
                            className="w-full rounded-xl border border-border/60 bg-card p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none h-20 shadow-sm"
                          />
                          <Button 
                            type="submit" 
                            disabled={isSubmittingNote || !newNoteText.trim()} 
                            className="shrink-0 h-10 w-10 p-0 rounded-xl shadow-sm cursor-pointer"
                            title="Enviar nota"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </form>

                    <div className="pt-4 border-t border-border/60 shrink-0">
                      <AttachmentManager
                        entityType="attendance"
                        entityId={selectedAttendanceDetails.id}
                        title="Evidências & Anexos"
                        readOnly={!canModifyAttendance(selectedAttendanceDetails)}
                        compact
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <DrawerFooter className="flex flex-row items-center justify-between border-t border-border/60 bg-card p-4">
                <div className="flex items-center gap-2">
                  {selectedAttendanceDetails.knowledge_article_id ? (
                    <Badge variant="secondary" className="flex items-center gap-1.5 py-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      Artigo Criado
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConvertToKnowledge(selectedAttendanceDetails)}
                      disabled={convertingId === selectedAttendanceDetails.id}
                      className="text-xs font-medium gap-1.5 border-primary/20 text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {convertingId === selectedAttendanceDetails.id ? 'Convertendo...' : 'Gerar Artigo'}
                    </Button>
                  )}
                </div>

                {canModifyAttendance(selectedAttendanceDetails) && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAttendance(selectedAttendanceDetails)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer h-9 px-3"
                    >
                      <Trash2 className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Excluir</span>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenForm(selectedAttendanceDetails)}
                      className="shadow-sm cursor-pointer h-9 px-4"
                    >
                      <Edit2 className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                  </div>
                )}
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* DRAWER: CREATE / EDIT ATTENDANCE */}
      <Drawer
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setLockedProjectName(undefined);
          }
        }}
      >
        <DrawerContent side="right" size="lg" className="p-0 flex flex-col h-full rounded-l-2xl sm:rounded-l-2xl rounded-tr-none sm:rounded-tr-none">
          <DrawerHeader className="px-6 py-5 bg-card border-b border-border/60">
            <DrawerTitle className="flex items-center gap-2 text-xl">
              <Headset className="h-5 w-5 text-primary" />
              {editingAttendance ? 'Editar Atendimento' : 'Novo Atendimento Técnico'}
            </DrawerTitle>
            <DrawerDescription className="mt-1">
              Documente os procedimentos operacionais para histórico interno.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSaveAttendance} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto bg-muted/10 p-6 space-y-6">
              
              {/* Section 1 */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Identificação Principal</h4>
                <div className="grid gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Título / Assunto *</label>
                    <Input
                      value={attendanceForm.title}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, title: e.target.value })}
                      placeholder="Ex: Instalação de Impressora Fiscal"
                      className="bg-card border-border/60 h-10"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1.5 block">Ticket OTRS (Referência)</label>
                      <Input
                        value={attendanceForm.otrs_ticket || ''}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, otrs_ticket: e.target.value })}
                        placeholder="Ex: 20260924001"
                        className="bg-card border-border/60 h-10 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1.5 block">Status</label>
                      <select
                        value={attendanceForm.status || 'em_andamento'}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                        className="w-full h-10 rounded-xl border border-border/60 bg-card px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                      >
                        <option value="em_andamento">Em Andamento</option>
                        <option value="resolvido">Resolvido</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Contexto & Origem</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Solicitante</label>
                    <Input
                      value={attendanceForm.requester_name || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, requester_name: e.target.value })}
                      placeholder="Nome do usuário"
                      className="bg-card border-border/60 h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Loja / Depto</label>
                    <Input
                      value={attendanceForm.store_department || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, store_department: e.target.value })}
                      placeholder="Localização"
                      className="bg-card border-border/60 h-10"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Equipamento Afetado</label>
                    <Input
                      value={attendanceForm.equipment_name || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, equipment_name: e.target.value })}
                      placeholder="Nome ou patrimônio (Ex: PDV01)"
                      className="bg-card border-border/60 h-10"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Projeto Operacional</label>
                    <ProjectSelect
                      value={attendanceForm.project_id || null}
                      onChange={(projectId) => setAttendanceForm({ ...attendanceForm, project_id: projectId || null })}
                      lockedContextName={lockedProjectName}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Relato Técnico</h4>
                <div className="grid gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Diagnóstico</label>
                    <textarea
                      value={attendanceForm.diagnosis || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, diagnosis: e.target.value })}
                      rows={3}
                      placeholder="Análise do problema constatado..."
                      className="w-full rounded-xl border border-border/60 bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Causa Raiz</label>
                    <textarea
                      value={attendanceForm.cause || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, cause: e.target.value })}
                      rows={2}
                      placeholder="O que originou a falha..."
                      className="w-full rounded-xl border border-border/60 bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Solução Aplicada</label>
                    <textarea
                      value={attendanceForm.solution || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, solution: e.target.value })}
                      rows={3}
                      placeholder="Procedimentos executados para resolver..."
                      className="w-full rounded-xl border border-border/60 bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Comandos (Terminal)</label>
                    <textarea
                      value={attendanceForm.commands_used || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, commands_used: e.target.value })}
                      rows={3}
                      placeholder="Scripts ou comandos utilizados..."
                      className="w-full rounded-xl border border-border/60 bg-card p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DrawerFooter className="flex flex-row items-center justify-end gap-3 border-t border-border/60 bg-card p-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="hover:bg-muted/50 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="shadow-sm cursor-pointer min-w-[120px]">
                {isSubmitting ? 'Salvando...' : editingAttendance ? 'Salvar Edição' : 'Criar Registro'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
