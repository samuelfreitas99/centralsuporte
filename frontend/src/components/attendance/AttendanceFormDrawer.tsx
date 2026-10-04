import React, { useEffect, useRef } from 'react';
import { Headset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ProjectSelect } from '@/components/projects/ProjectSelect';
import { EquipmentPicker } from '@/components/infrastructure/EquipmentPicker';
import type { AttendanceCreateInput } from '@/types/attendance';
import { useAttendanceContext } from '@/hooks/useAttendanceContext';
import { EquipmentHistory, SameTicketWarning } from './AttendanceContext';
import { TemplatePicker } from './TemplatePicker';
import { applyTemplate, parseOtrsInput } from './attendanceForm';

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-border/60 bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y';

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-4">
    <h4 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">{title}</h4>
    {children}
  </section>
);

const FormField: React.FC<{ label: string; hint?: string; className?: string; children: React.ReactNode }> = ({
  label,
  hint,
  className,
  children,
}) => (
  <div className={className}>
    <label className="text-xs font-bold text-foreground mb-1.5 block">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

interface AttendanceFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  /** Id do atendimento em edição (não aparece como "mesmo chamado"). */
  editingId?: number;
  /** Pode criar/excluir modelos (attendance:write). */
  canManageTemplates?: boolean;
  form: AttendanceCreateInput;
  setForm: React.Dispatch<React.SetStateAction<AttendanceCreateInput>>;
  /** Nome do projeto quando o atendimento é aberto a partir de um projeto (campo travado). */
  lockedProjectName?: string;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** Formulário de novo atendimento / edição, na ordem do trabalho do técnico. */
export const AttendanceFormDrawer: React.FC<AttendanceFormDrawerProps> = ({
  open,
  onOpenChange,
  isEditing,
  editingId,
  canManageTemplates = false,
  form,
  setForm,
  lockedProjectName,
  isSubmitting,
  onSubmit,
}) => {
  const setField = <K extends keyof AttendanceCreateInput>(key: K, value: AttendanceCreateInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const context = useAttendanceContext(open ? form.otrs_ticket || '' : '', open ? form.equipment_id : null, editingId);

  // Link do chamado montado pelo servidor (OTRS_TICKET_URL): preenche se vazio ou se foi preenchido por nós.
  const autoUrl = useRef('');
  const suggestedUrl = context?.otrs_url || '';
  useEffect(() => {
    if (!suggestedUrl) return;
    setForm((prev) => {
      if (prev.otrs_url && prev.otrs_url !== autoUrl.current) return prev;
      autoUrl.current = suggestedUrl;
      return { ...prev, otrs_url: suggestedUrl };
    });
  }, [suggestedUrl, setForm]);

  const handleTicketChange = (value: string) => {
    const parsed = parseOtrsInput(value);
    setForm((prev) => ({ ...prev, otrs_ticket: parsed.ticket, ...(parsed.url ? { otrs_url: parsed.url } : {}) }));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="lg" className="p-0 flex flex-col h-full rounded-l-2xl sm:rounded-l-2xl rounded-tr-none sm:rounded-tr-none">
        <DrawerHeader className="px-6 py-5 bg-card border-b border-border/60">
          <DrawerTitle className="flex items-center gap-2 text-xl">
            <Headset className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar atendimento' : 'Novo atendimento'}
          </DrawerTitle>
          <DrawerDescription className="mt-1">
            Registro técnico interno. O chamado oficial continua no OTRS.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-muted/10 p-6 space-y-6">
            
            <FormSection title="Chamado">
              {!isEditing && (
                <TemplatePicker canManage={canManageTemplates} onApply={(tpl) => setForm((prev) => applyTemplate(prev, tpl))} />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Nº do chamado OTRS" hint="Pode colar o link do chamado.">
                  <Input
                    value={form.otrs_ticket || ''}
                    onChange={(e) => handleTicketChange(e.target.value)}
                    placeholder="Ex.: 2026092410001"
                    className="bg-card border-border/60 h-10 font-mono"
                    autoFocus={!isEditing}
                  />
                </FormField>
                <FormField label="Link do chamado" className="sm:col-span-2">
                  <Input
                    type="url"
                    value={form.otrs_url || ''}
                    onChange={(e) => setField('otrs_url', e.target.value)}
                    placeholder="https://otrs.../TicketZoom;TicketID=..."
                    className="bg-card border-border/60 h-10"
                  />
                </FormField>
              </div>
              <SameTicketWarning items={context?.same_ticket ?? []} />
              <FormField label="Título *">
                <Input
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="Ex.: PDV 03 não imprime cupom"
                  className="bg-card border-border/60 h-10"
                  required
                />
              </FormField>
              <FormField label="Status">
                <select
                  value={form.status || 'em_andamento'}
                  onChange={(e) => setField('status', e.target.value)}
                  className="w-full sm:w-1/2 h-10 rounded-xl border border-border/60 bg-card px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="em_andamento">Em andamento</option>
                  <option value="resolvido">Resolvido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </FormField>
            </FormSection>

            <FormSection title="Onde e quem">
              <FormField label="Equipamento" hint="Vincule ao inventário para o atendimento aparecer na ficha do equipamento.">
                <EquipmentPicker
                  value={{ id: form.equipment_id ?? null, name: form.equipment_name || '' }}
                  onChange={(val, eq) =>
                    setForm((prev) => ({
                      ...prev,
                      equipment_id: val.id,
                      equipment_name: val.name,
                      store_department:
                        prev.store_department ||
                        [eq?.store?.name, eq?.department?.name].filter(Boolean).join(' / '),
                    }))
                  }
                />
              </FormField>
              <EquipmentHistory items={context?.equipment_history ?? []} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Loja / Departamento">
                  <Input
                    value={form.store_department || ''}
                    onChange={(e) => setField('store_department', e.target.value)}
                    placeholder="Ex.: Loja 03 / Frente de caixa"
                    className="bg-card border-border/60 h-10"
                  />
                </FormField>
                <FormField label="Solicitante">
                  <Input
                    value={form.requester_name || ''}
                    onChange={(e) => setField('requester_name', e.target.value)}
                    placeholder="Quem pediu o atendimento"
                    className="bg-card border-border/60 h-10"
                  />
                </FormField>
              </div>
              <FormField label="Projeto (opcional)">
                <ProjectSelect
                  value={form.project_id || null}
                  onChange={(projectId) => setField('project_id', projectId || null)}
                  lockedContextName={lockedProjectName}
                />
              </FormField>
            </FormSection>

            <FormSection title="O que aconteceu">
              <FormField label="Problema relatado">
                <textarea
                  value={form.problem_description || ''}
                  onChange={(e) => setField('problem_description', e.target.value)}
                  rows={3}
                  placeholder="O que o usuário relatou..."
                  className={TEXTAREA_CLASS}
                />
              </FormField>
              <FormField label="Sintomas observados">
                <textarea
                  value={form.symptoms || ''}
                  onChange={(e) => setField('symptoms', e.target.value)}
                  rows={2}
                  placeholder="Mensagens de erro, luzes, comportamento..."
                  className={TEXTAREA_CLASS}
                />
              </FormField>
            </FormSection>

            <FormSection title="Diagnóstico e solução">
              <FormField label="Diagnóstico">
                <textarea
                  value={form.diagnosis || ''}
                  onChange={(e) => setField('diagnosis', e.target.value)}
                  rows={3}
                  placeholder="O que foi verificado e constatado..."
                  className={TEXTAREA_CLASS}
                />
              </FormField>
              <FormField label="Causa">
                <textarea
                  value={form.cause || ''}
                  onChange={(e) => setField('cause', e.target.value)}
                  rows={2}
                  placeholder="O que originou o problema..."
                  className={TEXTAREA_CLASS}
                />
              </FormField>
              <FormField label="Solução aplicada">
                <textarea
                  value={form.solution || ''}
                  onChange={(e) => setField('solution', e.target.value)}
                  rows={3}
                  placeholder="O que foi feito para resolver..."
                  className={TEXTAREA_CLASS}
                />
              </FormField>
              <FormField label="Comandos utilizados">
                <textarea
                  value={form.commands_used || ''}
                  onChange={(e) => setField('commands_used', e.target.value)}
                  rows={3}
                  placeholder="Um comando por linha..."
                  className={`${TEXTAREA_CLASS} font-mono text-xs`}
                />
              </FormField>
            </FormSection>

            <FormSection title="Notas internas">
              <FormField label="Observações só para a equipe" hint="Não aparecem no OTRS. Para o andamento do dia a dia, use as notas no detalhe do atendimento.">
                <textarea
                  value={form.internal_notes || ''}
                  onChange={(e) => setField('internal_notes', e.target.value)}
                  rows={2}
                  className={TEXTAREA_CLASS}
                />
              </FormField>
            </FormSection>
          </div>

          <DrawerFooter className="flex flex-row items-center justify-end gap-3 border-t border-border/60 bg-card p-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="hover:bg-muted/50 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="shadow-sm cursor-pointer min-w-[120px]">
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Registrar atendimento'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};
