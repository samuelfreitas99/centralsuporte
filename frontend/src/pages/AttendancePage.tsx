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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { attendanceService } from '@/services/attendanceService';
import type {
  AttendanceItem,
  AttendanceCreateInput,
} from '@/types/attendance';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
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

  // Dialog state: Create / Edit Attendance
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  });

  // Dialog state: Technical Notes
  const [selectedAttendanceNotes, setSelectedAttendanceNotes] = useState<AttendanceItem | null>(null);
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

  // One-click copy commands used
  const handleCopyCommands = async (att: AttendanceItem) => {
    if (!att.commands_used) return;
    try {
      await navigator.clipboard.writeText(att.commands_used);
      setCopiedCmdId(att.id);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao converter atendimento em conhecimento';
      toastError('Erro na conversão', msg);
    } finally {
      setConvertingId(null);
    }
  };

  // Open Create/Edit modal
  const handleOpenModal = (att?: AttendanceItem) => {
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
      });
    } else {
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
      });
    }
    setIsModalOpen(true);
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
      setIsModalOpen(false);
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
      loadAttendances();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir atendimento';
      toastError('Erro ao excluir', msg);
    }
  };

  // Add Technical Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendanceNotes || !newNoteText.trim()) return;

    setIsSubmittingNote(true);
    try {
      const createdNote = await attendanceService.addNote(selectedAttendanceNotes.id, newNoteText.trim());
      success('Nota técnica adicionada', 'Novo apontamento registrado no atendimento.');
      setNewNoteText('');

      // Update local state
      const updatedNotes = [...selectedAttendanceNotes.notes, createdNote];
      setSelectedAttendanceNotes({ ...selectedAttendanceNotes, notes: updatedNotes });
      setAttendances((prev) =>
        prev.map((a) => (a.id === selectedAttendanceNotes.id ? { ...a, notes: updatedNotes } : a))
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
    return user.role?.name === 'Administrador' || att.technician_id === user.id;
  };

  // Status badge config
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolvido':
        return <Badge variant="success" className="text-xs">Resolvido</Badge>;
      case 'cancelado':
        return <Badge variant="secondary" className="text-xs">Cancelado</Badge>;
      case 'em_andamento':
      default:
        return <Badge variant="warning" className="text-xs">Em Andamento</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Atendimentos Internos
            </h1>
            <Badge variant="default" className="text-[11px] uppercase tracking-wider font-mono">
              Fase 7
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Registro técnico operacional complementar, diagnósticos, procedimentos e comandos vinculados a chamados OTRS.
          </p>
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Atendimento</span>
        </Button>
      </div>

      {/* 2. OTRS Architectural Complementarity Alert */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-blue-500/20 bg-blue-950/20 p-4 text-xs text-muted-foreground backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <span>Integração Oficial com OTRS</span>
            <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
          </span>
          <span>—</span>
          <span>Abertura, SLA, histórico do cliente e encerramento ocorrem exclusivamente no OTRS. A Central armazena diagnósticos técnicos, comandos e soluções da equipe.</span>
        </div>
        <span className="font-mono text-[11px] text-blue-400 shrink-0 font-semibold">Central Operacional</span>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por chamado OTRS, título, diagnóstico, equipamento, loja..."
            className="pl-10 h-10 bg-background/50 border-border/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="resolvido">Resolvido</option>
            <option value="cancelado">Cancelado</option>
          </select>

          {/* OTRS toggle filter */}
          <button
            onClick={() => setOnlyOtrs(!onlyOtrs)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              onlyOtrs
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                : 'border-border/80 bg-background/80 text-muted-foreground hover:text-foreground'
            }`}
          >
            <ExternalLink className="h-3 w-3" />
            <span>Apenas com Chamado OTRS</span>
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadAttendances}
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Atualizar lista de atendimentos"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 4. Main Content Area — 4 UI States */}

      {/* STATE 1: ERROR */}
      {errorMessage && (
        <Card className="border-red-500/30 bg-red-950/20">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-400" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-red-200">Falha ao carregar atendimentos</h3>
              <p className="text-sm text-red-300/80">{errorMessage}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAttendances}
              className="mt-2 border-red-500/30 hover:bg-red-500/10 text-red-300"
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STATE 2: LOADING SKELETONS */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/60 bg-card/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-24 rounded-md" />
                    <Skeleton className="h-6 w-28 rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* STATE 3: EMPTY STATE */}
      {!isLoading && !errorMessage && attendances.length === 0 && (
        <Card className="border-border/60 bg-card/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Headset className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-semibold text-foreground font-heading">
                Nenhum atendimento operacional registrado
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedStatus !== 'all' || onlyOtrs
                  ? 'Nenhum atendimento corresponde aos filtros aplicados. Tente limpar ou ajustar a busca.'
                  : 'Comece a registrar o histórico técnico de atendimentos para documentar diagnósticos, comandos e procedimentos da equipe.'}
              </p>
            </div>
            <Button onClick={() => handleOpenModal()} className="mt-2 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Registrar Primeiro Atendimento</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STATE 4: IDEAL STATE — ATTENDANCES LIST */}
      {!isLoading && !errorMessage && attendances.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {attendances.map((att) => {
              const hasCommands = Boolean(att.commands_used && att.commands_used.trim().length > 0);
              const isCopied = copiedCmdId === att.id;
              const isConverting = convertingId === att.id;

              return (
                <motion.div
                  key={att.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-border/80 bg-card/75 hover:border-blue-500/40 hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-5 space-y-4">
                      {/* Top Row: OTRS badge, Status, Equipment and Store info */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {att.otrs_ticket ? (
                            <a
                              href={att.otrs_url || '#'}
                              target={att.otrs_url ? '_blank' : '_self'}
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-950/40 px-2.5 py-1 text-xs font-mono font-bold text-blue-400 hover:bg-blue-900/40 transition-colors"
                            >
                              <span>Chamado #{att.otrs_ticket}</span>
                              <ExternalLink className="h-3 w-3 opacity-70" />
                            </a>
                          ) : (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground border-border/60">
                              Atendimento Interno
                            </Badge>
                          )}

                          {getStatusBadge(att.status)}

                          {att.equipment_name && (
                            <span className="flex items-center gap-1 text-xs text-slate-300 font-medium bg-muted/40 px-2 py-0.5 rounded-md">
                              <HardDrive className="h-3 w-3 text-blue-400" />
                              <span>{att.equipment_name}</span>
                            </span>
                          )}

                          {att.store_department && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span>{att.store_department}</span>
                            </span>
                          )}
                        </div>

                        {/* Technician capsule */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="hidden sm:inline">Técnico:</span>
                          <span className="font-semibold text-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                            {att.technician?.username || 'Suporte'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Requester */}
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground font-heading tracking-tight">
                          {att.title}
                        </h3>
                        {att.requester_name && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Solicitante: <span className="text-foreground/90 font-medium">{att.requester_name}</span>
                          </p>
                        )}
                      </div>

                      {/* Technical Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Diagnosis & Problem */}
                        <div className="rounded-xl border border-border/70 bg-background/50 p-3 space-y-1.5">
                          <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                            <Clock className="h-3.5 w-3.5 text-blue-400" />
                            <span>Diagnóstico & Causa</span>
                          </p>
                          <p className="text-muted-foreground leading-relaxed line-clamp-3">
                            {att.diagnosis || att.problem_description || 'Nenhum diagnóstico detalhado informado.'}
                          </p>
                          {att.cause && (
                            <p className="text-[11px] text-amber-300/90 font-medium pt-1 border-t border-border/40">
                              <span className="font-bold">Causa:</span> {att.cause}
                            </p>
                          )}
                        </div>

                        {/* Solution */}
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-3 space-y-1.5">
                          <p className="font-semibold text-emerald-400 flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Solução Aplicada</span>
                          </p>
                          <p className="text-slate-300 leading-relaxed line-clamp-3">
                            {att.solution || 'Procedimento de solução em andamento.'}
                          </p>
                        </div>
                      </div>

                      {/* Commands Used Box (with 1-Click Copy) */}
                      {hasCommands && (
                        <div className="rounded-xl border border-border/80 bg-slate-950 p-3 overflow-hidden shadow-inner">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pb-1 mb-1 border-b border-white/[0.05]">
                            <span className="flex items-center gap-1.5 text-blue-400">
                              <Terminal className="h-3.5 w-3.5" />
                              <span>Comandos executados durante o atendimento</span>
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyCommands(att)}
                              className="h-6 px-2 text-[10px] text-slate-300 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400 mr-1" />
                                  <span className="text-emerald-400">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1 text-blue-400" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="font-mono text-xs text-blue-300 whitespace-pre-wrap break-all py-1">
                            {att.commands_used}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions: Notes, Knowledge Conversion, Edit/Delete */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 text-xs">
                        {/* Left action buttons */}
                        <div className="flex items-center gap-2">
                          {/* Notes Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAttendanceNotes(att)}
                            className="h-8 text-xs flex items-center gap-1.5 border-border/80 cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                            <span>Notas ({att.notes?.length || 0})</span>
                          </Button>

                          {/* Save as Knowledge Action */}
                          {att.knowledge_article_id ? (
                            <Badge variant="success" className="flex items-center gap-1 text-[11px] py-1 px-2.5">
                              <Sparkles className="h-3 w-3" />
                              <span>Salvo na Base de Conhecimento</span>
                            </Badge>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleConvertToKnowledge(att)}
                              disabled={isConverting}
                              className="h-8 text-xs flex items-center gap-1.5 bg-blue-600/15 text-blue-300 hover:bg-blue-600/25 border border-blue-500/30 cursor-pointer"
                            >
                              <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                              <span>{isConverting ? 'Convertendo...' : 'Salvar como Conhecimento'}</span>
                            </Button>
                          )}
                        </div>

                        {/* Edit & Delete Controls */}
                        {canModifyAttendance(att) && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(att)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              aria-label="Editar atendimento"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAttendance(att)}
                              className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                              aria-label="Excluir atendimento"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

      {/* 5. MODAL: CREATE / EDIT ATTENDANCE */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSaveAttendance} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Headset className="h-5 w-5 text-blue-400" />
                <span>{editingAttendance ? 'Editar Atendimento Técnico' : 'Novo Atendimento Técnico'}</span>
              </DialogTitle>
              <DialogDescription>
                Documente o trabalho operacional interno realizado para compor o histórico e alimentar a base de conhecimento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
              {/* Seção 1: Identificação & Chamado */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Identificação do Atendimento & Chamado Oficial
                </p>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Título do Atendimento / Problema *
                  </label>
                  <Input
                    value={attendanceForm.title}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, title: e.target.value })}
                    placeholder="Ex: Travamento Spooler de Impressão PDV 02"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Número do Chamado OTRS (Opcional)
                    </label>
                    <Input
                      value={attendanceForm.otrs_ticket || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, otrs_ticket: e.target.value })}
                      placeholder="Ex: 20260924001 ou #12345"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Link do Chamado no OTRS (Opcional)
                    </label>
                    <Input
                      value={attendanceForm.otrs_url || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, otrs_url: e.target.value })}
                      placeholder="https://otrs.empresa.local/otrs/index.pl?..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Solicitante / Contato
                    </label>
                    <Input
                      value={attendanceForm.requester_name || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, requester_name: e.target.value })}
                      placeholder="Ex: Gerente Carlos"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Status do Atendimento
                    </label>
                    <select
                      value={attendanceForm.status || 'em_andamento'}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="em_andamento">Em Andamento</option>
                      <option value="resolvido">Resolvido</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Localização & Equipamento */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Localização & Equipamento Afetado
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Equipamento / PDV
                    </label>
                    <Input
                      value={attendanceForm.equipment_name || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, equipment_name: e.target.value })}
                      placeholder="Ex: PDV 02 - Bematech"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Loja / Departamento
                    </label>
                    <Input
                      value={attendanceForm.store_department || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, store_department: e.target.value })}
                      placeholder="Ex: Loja 04 - Centro / Caixa"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Diagnóstico & Resolução */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  3. Diagnóstico Técnico & Resolução
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Diagnóstico Técnico
                    </label>
                    <textarea
                      value={attendanceForm.diagnosis || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, diagnosis: e.target.value })}
                      rows={3}
                      placeholder="Como o problema foi identificado, testes executados..."
                      className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Causa Raiz
                    </label>
                    <textarea
                      value={attendanceForm.cause || ''}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, cause: e.target.value })}
                      rows={3}
                      placeholder="Origem do problema quando conhecida..."
                      className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Procedimento de Solução
                  </label>
                  <textarea
                    value={attendanceForm.solution || ''}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, solution: e.target.value })}
                    rows={3}
                    placeholder="O que foi realizado passo a passo para solucionar..."
                    className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed font-sans"
                  />
                </div>
              </div>

              {/* Seção 4: Comandos de Terminal */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    4. Comandos Utilizados (Terminal)
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">Para consulta e reutilização futura</span>
                </label>
                <textarea
                  value={attendanceForm.commands_used || ''}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, commands_used: e.target.value })}
                  rows={2}
                  placeholder="Ex: net stop spooler && del /Q /F %systemroot%\System32\Spool\Printers\* && net start spooler"
                  className="w-full rounded-lg border border-border/80 bg-card p-2.5 font-mono text-xs text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? 'Salvando...' : editingAttendance ? 'Salvar Alterações' : 'Registrar Atendimento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL / DRAWER: TECHNICAL NOTES */}
      <Dialog
        open={Boolean(selectedAttendanceNotes)}
        onOpenChange={(open) => !open && setSelectedAttendanceNotes(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <span>Notas Técnicas Internas</span>
            </DialogTitle>
            <DialogDescription>
              {selectedAttendanceNotes?.title}
            </DialogDescription>
          </DialogHeader>

          {/* Notes list */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {selectedAttendanceNotes?.notes && selectedAttendanceNotes.notes.length > 0 ? (
              selectedAttendanceNotes.notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-semibold text-foreground">{n.author?.username || 'Técnico'}</span>
                    <span className="text-[10px] font-mono">{new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{n.note}</p>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-muted-foreground">
                Nenhum apontamento técnico registrado ainda.
              </p>
            )}
          </div>

          {/* New note input form */}
          <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-border/60">
            <label className="text-xs font-semibold text-foreground block">
              Adicionar Apontamento Técnico
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Ex: Realizado teste após reinicialização..."
                className="text-xs h-9 bg-background/60"
              />
              <Button type="submit" size="sm" disabled={isSubmittingNote || !newNoteText.trim()} aria-label="Adicionar nota" className="h-9 px-3 shrink-0 cursor-pointer">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedAttendanceNotes(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
