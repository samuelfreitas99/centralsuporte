import React, { useState } from 'react';
import { formatDate, formatTime } from '@/lib/format';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  HardDrive,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  Terminal,
  Trash2,
  User,
  FileStack,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { AttachmentManager } from '@/components/attachments/AttachmentManager';
import { attendanceService } from '@/services/attendanceService';
import { usePrompt } from '@/hooks/usePrompt';
import type { AttendanceItem } from '@/types/attendance';

const DetailBlock: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div className="space-y-2">
    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
      {icon}
      {title}
    </h4>
    <div className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground leading-relaxed shadow-sm whitespace-pre-wrap">
      {children}
    </div>
  </div>
);

interface AttendanceDetailDrawerProps {
  /** Atendimento completo (com notas), vindo de GET /attendances/{id}. `null` = fechado. */
  attendance: AttendanceItem | null;
  onClose: () => void;
  /** Avisado quando o atendimento muda aqui (nova nota, artigo gerado). */
  onUpdated: (attendance: AttendanceItem) => void;
  onEdit: (attendance: AttendanceItem) => void;
  onDelete: (attendance: AttendanceItem) => void;
  /** Técnico responsável ou administrador. */
  canModify: boolean;
  /** Pode criar modelos de atendimento (attendance:write). */
  canSaveTemplate?: boolean;
}

/** Detalhe do atendimento: relato técnico, notas de andamento, anexos e conversão em artigo. */
export const AttendanceDetailDrawer: React.FC<AttendanceDetailDrawerProps> = ({
  attendance,
  onClose,
  onUpdated,
  onEdit,
  onDelete,
  canModify,
  canSaveTemplate = false,
}) => {
  const { success, error: toastError } = useToast();
  const [detailsTab, setDetailsTab] = useState('info');
  const [copied, setCopied] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [converting, setConverting] = useState(false);

  const [savingTemplate, setSavingTemplate] = useState(false);
  const prompt = usePrompt();

  /** Transforma este atendimento num modelo para problemas parecidos. */
  const handleSaveAsTemplate = async () => {
    if (!attendance) return;
    const name = await prompt({
      title: 'Salvar como modelo',
      description: 'Diagnóstico, causa, solução e comandos viram texto pronto para atendimentos parecidos.',
      label: 'Nome do modelo',
      defaultValue: attendance.title,
      placeholder: 'Ex.: Impressora fiscal sem papel',
    });
    if (!name) return;
    setSavingTemplate(true);
    try {
      await attendanceService.createTemplate({
        name: name.trim(),
        title: attendance.title,
        problem_description: attendance.problem_description,
        symptoms: attendance.symptoms,
        diagnosis: attendance.diagnosis,
        cause: attendance.cause,
        solution: attendance.solution,
        commands_used: attendance.commands_used,
      });
      success('Modelo salvo', 'Use em "Novo atendimento → Usar modelo".');
    } catch (err) {
      toastError('Não foi possível salvar o modelo', err instanceof Error ? err.message : '');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleCopyCommands = async (commands: string) => {
    if (!commands) return;
    try {
      await navigator.clipboard.writeText(commands);
      setCopied(true);
      success('Comandos copiados!', 'Comandos utilizados foram copiados para a área de transferência.');
    } catch {
      toastError('Erro ao copiar', 'Não foi possível copiar os comandos.');
    } finally {
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConvertToKnowledge = async () => {
    if (!attendance) return;
    setConverting(true);
    try {
      const article = await attendanceService.convertToKnowledge(attendance.id);
      success('Rascunho criado na Base de Conhecimento!', `Artigo "${article.title}" gerado para revisão.`);
      onUpdated({ ...attendance, knowledge_article_id: article.id });
    } catch (err: unknown) {
      toastError('Erro na conversão', err instanceof Error ? err.message : 'Falha ao converter atendimento em conhecimento');
    } finally {
      setConverting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendance || !newNoteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const createdNote = await attendanceService.addNote(attendance.id, newNoteText.trim());
      success('Nota adicionada', 'Novo apontamento registrado no atendimento.');
      setNewNoteText('');
      onUpdated({ ...attendance, notes: [...(attendance.notes ?? []), createdNote] });
    } catch (err: unknown) {
      toastError('Erro', err instanceof Error ? err.message : 'Falha ao adicionar nota');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <Drawer open={Boolean(attendance)} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent side="right" size="lg" className="p-0 flex flex-col h-full rounded-l-2xl sm:rounded-l-2xl rounded-tr-none sm:rounded-tr-none">
        {attendance && (
          <>
            <DrawerHeader className="px-6 py-5 bg-card border-b border-border/60">
              <div className="flex items-center gap-2 mb-3">
                {attendance.otrs_ticket ? (
                  <a
                    href={attendance.otrs_url || '#'}
                    target={attendance.otrs_url ? '_blank' : '_self'}
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Chamado OTRS #{attendance.otrs_ticket}</span>
                  </a>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
                    Atendimento Interno
                  </Badge>
                )}
                {<StatusBadge domain="attendance" status={attendance.status} className="text-[10px] uppercase py-0 leading-tight" />}
              </div>
              <DrawerTitle className="text-xl leading-snug mb-1">
                {attendance.title}
              </DrawerTitle>
              <DrawerDescription className="flex items-center gap-3 mt-2 text-xs font-medium">
                <span className="flex items-center gap-1 text-foreground/80"><User className="h-3.5 w-3.5 text-muted-foreground" /> {attendance.technician?.username}</span>
                {attendance.equipment_name &&
                  (attendance.equipment_id ? (
                    <a
                      href={`#equipment?id=${attendance.equipment_id}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                      title="Abrir ficha do equipamento"
                    >
                      <HardDrive className="h-3.5 w-3.5" /> {attendance.equipment_name}
                    </a>
                  ) : (
                    <span className="flex items-center gap-1 text-foreground/80"><HardDrive className="h-3.5 w-3.5 text-muted-foreground" /> {attendance.equipment_name}</span>
                  ))}
                {attendance.store_department && (
                  <span className="flex items-center gap-1 text-foreground/80"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {attendance.store_department}</span>
                )}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
              <Tabs value={detailsTab} onValueChange={setDetailsTab} className="w-full h-full flex flex-col">
                <TabsList className="mb-6 w-full justify-start border-b border-border/40 rounded-none h-auto p-0 bg-transparent gap-6">
                  <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 py-2 text-sm">
                    Detalhes
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 py-2 text-sm flex items-center gap-2">
                    Notas & Anexos
                    <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px]">
                      {attendance.notes?.length || 0}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6 flex-1 outline-none mt-0">
                  <div className="grid gap-6">
                    {(attendance.problem_description || attendance.symptoms) && (
                      <DetailBlock icon={<MessageSquare className="h-4 w-4 text-sky-500" />} title="Problema relatado">
                        {attendance.problem_description}
                        {attendance.symptoms && (
                          <p className="mt-2 text-xs"><span className="font-semibold">Sintomas:</span> {attendance.symptoms}</p>
                        )}
                      </DetailBlock>
                    )}

                    <DetailBlock icon={<Clock className="h-4 w-4 text-primary" />} title="Diagnóstico">
                      {attendance.diagnosis || 'Ainda não informado.'}
                    </DetailBlock>

                    {/* Causa */}
                    {attendance.cause && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          Causa
                        </h4>
                        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm text-foreground/80 leading-relaxed shadow-sm">
                          {attendance.cause}
                        </div>
                      </div>
                    )}

                    {/* Solução */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Solução aplicada
                      </h4>
                      <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-foreground/80 leading-relaxed shadow-sm">
                        {attendance.solution || 'Procedimento ainda não finalizado.'}
                      </div>
                    </div>

                    {/* Comandos */}
                    {attendance.commands_used && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            <Terminal className="h-4 w-4 text-primary" />
                            Comandos Utilizados
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyCommands(attendance.commands_used!)}
                            className="h-7 text-xs font-medium cursor-pointer hover:bg-muted/50"
                          >
                            {copied ? (
                              <><Check className="h-3 w-3 mr-1.5 text-success" /> Copiado!</>
                            ) : (
                              <><Copy className="h-3 w-3 mr-1.5" /> Copiar</>
                            )}
                          </Button>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-slate-950 p-4 shadow-inner">
                          <pre className="font-mono text-xs text-blue-300 whitespace-pre-wrap break-all">
                            {attendance.commands_used}
                          </pre>
                        </div>
                      </div>
                    )}

                    {attendance.internal_notes && (
                      <DetailBlock icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} title="Notas internas">
                        {attendance.internal_notes}
                      </DetailBlock>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-6 flex-1 flex flex-col outline-none mt-0">
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {attendance.notes && attendance.notes.length > 0 ? (
                      attendance.notes.map((n) => (
                        <div key={n.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-2 shadow-sm">
                          <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {n.author?.username || 'Técnico'}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {formatDate(n.created_at)} {formatTime(n.created_at)}
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
                      entityId={attendance.id}
                      title="Evidências & Anexos"
                      readOnly={!canModify}
                      compact
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DrawerFooter className="flex flex-row items-center justify-between border-t border-border/60 bg-card p-4">
              <div className="flex items-center gap-2">
                {attendance.knowledge_article_id ? (
                  <Badge variant="secondary" className="flex items-center gap-1.5 py-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    Artigo Criado
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConvertToKnowledge()}
                    disabled={converting}
                    className="text-xs font-medium gap-1.5 border-primary/20 text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {converting ? 'Convertendo...' : 'Gerar Artigo'}
                  </Button>
                )}
                {canSaveTemplate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveAsTemplate}
                    disabled={savingTemplate}
                    className="text-xs font-medium gap-1.5 cursor-pointer"
                  >
                    <FileStack className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Salvar como modelo</span>
                  </Button>
                )}
              </div>

              {canModify && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(attendance)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer h-9 px-3"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Excluir</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onEdit(attendance)}
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
  );
};
